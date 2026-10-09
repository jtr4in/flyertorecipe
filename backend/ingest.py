"""Fetch this week's flyer deals from Apify and store them in Firestore.

    python ingest.py                         # postal codes from POSTAL_CODES
    python ingest.py --postal "M5V 2T6"      # one-off
    python ingest.py --dry-run out.json      # fetch, normalize, write JSON, skip Firestore
    python ingest.py --from-file raw.json    # skip Apify, load raw actor rows from a file
    python ingest.py --reuse-last-run        # re-process the last Apify run (free)

Flyers are the same across neighbouring postal areas, so one fetch can serve several.
List extra FSAs after a colon:  POSTAL_CODES="K1E 0A1:K1C,K1W,K4A"  (all of Orleans, one fetch)

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


def fetch_raw(postal_code: str, reuse_last_run: bool = False) -> list[dict]:
    from apify_client import ApifyClient

    token = os.environ.get("APIFY_TOKEN")
    if not token:
        sys.exit("APIFY_TOKEN is not set (see backend/.env.example)")
    client = ApifyClient(token)
    if reuse_last_run:
        # Re-read the last successful run's results: no new run, no per-deal charge.
        # Only meaningful with a single postal code, since it ignores postal_code.
        return list(client.actor(ACTOR_ID).last_run(status="SUCCEEDED").dataset().iterate_items())
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


def parse_targets(spec: str) -> tuple[str, list[str]]:
    """'K1E 0A1:K1C,K1W,K4A' -> ('K1E 0A1', ['K1E', 'K1C', 'K1W', 'K4A'])"""
    code, _, extra = spec.partition(":")
    code = code.strip()
    fsas = [fsa(code)]
    for x in extra.split(","):
        x = x.strip().upper()
        if x and x not in fsas:
            if not (len(x) == 3 and x[0].isalpha() and x[1].isdigit() and x[2].isalpha()):
                raise ValueError(f"Not an FSA: {x!r}")
            fsas.append(x)
    return code, fsas


def write_firestore(postal_code: str, region_fsa: str, deals: list[dict]) -> None:
    import firebase_admin
    from firebase_admin import firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app()  # uses GOOGLE_APPLICATION_CREDENTIALS
    db = firestore.client()
    region = db.collection("regions").document(region_fsa)
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
        "fsa": region_fsa,
        "postalCode": postal_code,
        "dealCount": len(deals),
        "merchants": sorted({d["merchant"] for d in deals if d["merchant"]}),
        "ingestedAt": datetime.now(timezone.utc).isoformat(),
    })
    print(f"{region_fsa}: wrote {len(deals)} deals, removed {len(stale)} stale")


def main() -> None:
    load_dotenv()
    p = argparse.ArgumentParser()
    p.add_argument("--postal", action="append", help="postal code (repeatable)")
    p.add_argument("--dry-run", metavar="OUT_JSON")
    p.add_argument("--from-file", metavar="RAW_JSON")
    p.add_argument("--reuse-last-run", action="store_true",
                   help="re-process the last Apify run instead of paying for a new one")
    a = p.parse_args()

    raw = os.environ.get("POSTAL_CODES", "")
    # Entries are separated by ";" (or "," when no entry uses the ":" form).
    specs = a.postal or [s.strip() for s in (raw.split(";") if ":" in raw else raw.split(",")) if s.strip()]
    if not specs:
        sys.exit("No postal codes: pass --postal or set POSTAL_CODES")
    targets = [parse_targets(s) for s in specs]  # validate everything before spending money
    if a.reuse_last_run and len(targets) > 1:
        sys.exit("--reuse-last-run only works with one postal code entry")

    out = {}
    for code, fsas in targets:
        rows = json.load(open(a.from_file)) if a.from_file else fetch_raw(code, a.reuse_last_run)
        deals = build_deals(rows)
        print(f"{code}: {len(rows)} rows -> {len(deals)} deals for {', '.join(fsas)}")
        for f in fsas:
            if a.dry_run:
                out[f] = deals
            else:
                write_firestore(code, f, deals)
    if a.dry_run:
        json.dump(out, open(a.dry_run, "w"), indent=2)


if __name__ == "__main__":
    main()
