"""Fetch this week's flyer deals from Apify and store them in Firestore.

    python ingest.py                         # postal codes from POSTAL_CODES
    python ingest.py --postal "M5V 2T6"      # one-off
    python ingest.py --dry-run out.json      # fetch, normalize, write JSON, skip Firestore
    python ingest.py --from-file raw.json    # skip Apify, load raw actor rows from a file

Firestore layout:
    regions/{FSA}                 {fsa, postalCode, dealCount, merchants, ingestedAt}
    regions/{FSA}/deals/{dealId}  normalized deal (see normalize.py)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from decimal import Decimal

from dotenv import load_dotenv

from normalize import dedupe, fsa, normalize
from staples import STAPLE_QUERIES

ACTOR_ID = "gratifying_graph/canada-grocery-deals"


def fetch_raw(postal_code: str) -> list[dict]:
    from apify_client import ApifyClient

    token = os.environ.get("APIFY_TOKEN")
    if not token:
        sys.exit("APIFY_TOKEN is not set (see backend/.env.example)")
    client = ApifyClient(token)
    run = client.actor(ACTOR_ID).call(
        run_input={
            "postalCode": postal_code,
            "queries": STAPLE_QUERIES,
            "maxItemsPerQuery": int(os.environ.get("MAX_ITEMS_PER_QUERY", 20)),
            "onlyWithPrice": True,
            "locale": os.environ.get("LOCALE", "en-ca"),
        },
        max_total_charge_usd=Decimal(os.environ.get("MAX_CHARGE_USD", "2.00")),
    )
    if run is None:
        sys.exit("Actor run did not return")
    dataset_id = getattr(run, "default_dataset_id", None) or run["defaultDatasetId"]
    return list(client.dataset(dataset_id).iterate_items())


def build_deals(rows: list[dict]) -> list[dict]:
    now = datetime.now(timezone.utc)
    return dedupe([d for d in (normalize(r, now) for r in rows) if d])


def write_firestore(postal_code: str, deals: list[dict]) -> None:
    import firebase_admin
    from firebase_admin import firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app()  # uses GOOGLE_APPLICATION_CREDENTIALS
    db = firestore.client()
    region = db.collection("regions").document(fsa(postal_code))
    deals_ref = region.collection("deals")

    keep = {d["dealId"] for d in deals}
    stale = [doc.reference for doc in deals_ref.stream() if doc.id not in keep]

    ops = [("set", deals_ref.document(d["dealId"]), d) for d in deals]
    ops += [("delete", ref, None) for ref in stale]
    for i in range(0, len(ops), 450):  # Firestore batch limit is 500
        batch = db.batch()
        for kind, ref, data in ops[i : i + 450]:
            batch.set(ref, data) if kind == "set" else batch.delete(ref)
        batch.commit()

    region.set({
        "fsa": fsa(postal_code),
        "postalCode": postal_code,
        "dealCount": len(deals),
        "merchants": sorted({d["merchant"] for d in deals if d["merchant"]}),
        "ingestedAt": datetime.now(timezone.utc).isoformat(),
    })
    print(f"{fsa(postal_code)}: wrote {len(deals)} deals, removed {len(stale)} stale")


def main() -> None:
    load_dotenv()
    p = argparse.ArgumentParser()
    p.add_argument("--postal", action="append", help="postal code (repeatable)")
    p.add_argument("--dry-run", metavar="OUT_JSON")
    p.add_argument("--from-file", metavar="RAW_JSON")
    a = p.parse_args()

    codes = a.postal or [c.strip() for c in os.environ.get("POSTAL_CODES", "").split(",") if c.strip()]
    if not codes:
        sys.exit("No postal codes: pass --postal or set POSTAL_CODES")

    out = {}
    for code in codes:
        fsa(code)  # validate before spending money
        rows = json.load(open(a.from_file)) if a.from_file else fetch_raw(code)
        deals = build_deals(rows)
        if a.dry_run:
            out[fsa(code)] = deals
            print(f"{fsa(code)}: {len(rows)} rows -> {len(deals)} deals")
        else:
            write_firestore(code, deals)
    if a.dry_run:
        json.dump(out, open(a.dry_run, "w"), indent=2)


if __name__ == "__main__":
    main()
