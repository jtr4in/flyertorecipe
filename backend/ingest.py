"""Fetch this week's flyer deals from Apify and store them in Firestore.

    python ingest.py                         # postal codes from POSTAL_CODES
    python ingest.py --postal "M5V 2T6"      # one-off
    python ingest.py --dry-run out.json      # fetch, normalize, write JSON, skip Firestore
    python ingest.py --from-file raw.json    # skip Apify, load raw actor rows from a file
    python ingest.py --reuse-last-run        # re-process the last Apify run (free)

Flyers are the same across neighbouring postal areas, so one fetch can serve several.
List extra FSAs after a colon:  POSTAL_CODES="K1E 0A1:K1C,K1W,K4A"  (all of Orleans, one fetch)

Deals come from every item on the area's grocery flyers, read straight from Flipp (free).
If that comes back nearly empty, the paid Apify search actor fills in (see staples.py).

Firestore layout:
    regions/{FSA}                  {fsa, postalCode, dealCount, chunks, merchants, ingestedAt, source}
    regions/{FSA}/deals/chunk-NN   {deals: [normalized deal, ...]}  (see normalize.py)
A full week is thousands of deals, so they're packed a few thousand to a document: the app
reads the whole region in a handful of reads instead of one per deal.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from decimal import Decimal

from dotenv import load_dotenv

from flyer_clips import add_item_details, attach_clips, clip_index, flyer_rows, grocery_flyers
from normalize import dedupe, fsa, normalize
from staples import QUERY_LIMITS, SEARCH_BUDGET

ACTOR_ID = "gratifying_graph/canada-grocery-deals"
# Fewer flyer items than this means Flipp's flyer feed failed or changed; use the search actor.
MIN_FLYER_ROWS = 300
# Firestore caps a document at 1 MiB; leave room for its own overhead.
CHUNK_BYTES = 700_000


def fetch_raw(postal_code: str, reuse_last_run: bool = False) -> list[dict]:
    from apify_client import ApifyClient

    token = os.environ.get("APIFY_TOKEN")
    if not token:
        sys.exit("APIFY_TOKEN is not set (see backend/.env.example)")
    client = ApifyClient(token)
    if reuse_last_run:
        # Re-read the last successful run's results: no new run, no per-deal charge.
        # Only meaningful with a single postal code, since it ignores postal_code; covers
        # the last limit tier only.
        return list(client.actor(ACTOR_ID).last_run(status="SUCCEEDED").dataset().iterate_items())
    # One run per limit tier (the actor takes a single per-term limit), sharing the charge cap.
    cap = Decimal(os.environ.get("MAX_CHARGE_USD", "4.50"))
    rows: list[dict] = []
    for limit, terms in QUERY_LIMITS.items():
        share = (cap * limit * len(terms) / SEARCH_BUDGET).quantize(Decimal("0.01"))
        run = client.actor(ACTOR_ID).call(
            run_input={
                "postalCode": postal_code,
                "queries": terms,
                "maxItemsPerQuery": limit,
                "onlyWithPrice": True,
                "locale": os.environ.get("LOCALE", "en-ca"),
            },
            max_total_charge_usd=share,
        )
        if run is None:
            sys.exit("Actor run did not return")
        dataset_id = getattr(run, "default_dataset_id", None) or run["defaultDatasetId"]
        rows.extend(client.dataset(dataset_id).iterate_items())
    return rows


def build_deals(rows: list[dict]) -> list[dict]:
    now = datetime.now(timezone.utc)
    return dedupe([d for d in (normalize(r, now) for r in rows) if d])


def slim(deal: dict) -> dict:
    """What the app reads: empty fields and bookkeeping dropped to keep the region small."""
    return {k: v for k, v in deal.items() if v not in (None, "", []) and k not in ("fetchedAt", "flippItemId")}


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


def chunk_deals(deals: list[dict], limit: int = CHUNK_BYTES) -> list[list[dict]]:
    """Split deals into groups whose JSON stays under `limit` bytes."""
    chunks: list[list[dict]] = [[]]
    size = 0
    for d in deals:
        n = len(json.dumps(d, ensure_ascii=False).encode()) + 1
        if chunks[-1] and size + n > limit:
            chunks.append([])
            size = 0
        chunks[-1].append(d)
        size += n
    return [c for c in chunks if c]


def write_firestore(postal_code: str, region_fsa: str, deals: list[dict], source: str = "flyers") -> None:
    import firebase_admin
    from firebase_admin import firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app()  # uses GOOGLE_APPLICATION_CREDENTIALS
    db = firestore.client()
    region = db.collection("regions").document(region_fsa)
    deals_ref = region.collection("deals")

    chunks = chunk_deals([slim(d) for d in deals])
    ids = [f"chunk-{i:02d}" for i in range(len(chunks))]
    for i, c in zip(ids, chunks):  # one write each: a batch caps out at 10 MiB
        deals_ref.document(i).set({"deals": c})

    region.set({
        "fsa": region_fsa,
        "postalCode": postal_code,
        "dealCount": len(deals),
        "chunks": len(chunks),
        "source": source,
        "merchants": sorted({d["merchant"] for d in deals if d["merchant"]}),
        "ingestedAt": datetime.now(timezone.utc).isoformat(),
    })
    # Old documents (one per deal, or extra chunks from a bigger week) go last, so a failed
    # cleanup (say, the daily read quota is spent) still leaves this week's deals in place.
    removed = 0
    try:
        stale = [ref for ref in deals_ref.list_documents() if ref.id not in ids]
        for i in range(0, len(stale), 450):  # Firestore batch limit is 500
            batch = db.batch()
            for ref in stale[i : i + 450]:
                batch.delete(ref)
            batch.commit()
        removed = len(stale)
    except Exception as e:
        print(f"{region_fsa}: old documents not cleaned up ({e})")
    print(f"{region_fsa}: wrote {len(deals)} deals in {len(chunks)} documents, removed {removed} old")


def sample_keys(flyers) -> str:
    """The raw fields on one flyer item, so a changed feed is easy to spot in the run summary."""
    for _, detail in flyers:
        for it in detail.get("items", []):
            if it.get("name"):
                keep = ("name", "brand", "price", "pre_price_text", "post_price_text", "sale_story", "discount", "original_price")
                return json.dumps({"keys": sorted(it), **{k: it.get(k) for k in keep}}, ensure_ascii=False)[:900]
    return "no items"


def sample_detail(flyers) -> str:
    """A few items' price text after the detail pass, to check it in the run summary."""
    out = []
    for _, detail in flyers:
        for it in detail.get("items", []):
            if it.get("post_price_text") or it.get("pre_price_text") or it.get("sale_story"):
                out.append({k: it.get(k) for k in ("name", "price", "pre_price_text", "post_price_text", "sale_story", "original_price")})
                if len(out) == 4:
                    return json.dumps(out, ensure_ascii=False)[:900]
    return json.dumps(out, ensure_ascii=False)[:900] or "none"


def notice(title: str, message: str) -> None:
    """A GitHub Actions annotation (shown on the run page); plain output elsewhere."""
    msg = message.replace("%", "%25").replace("\r", "").replace("\n", " ")
    print(f"::notice title={title.replace(':', ' -').replace(',', ';')}::{msg}")


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
        flyers, source = [], "flyers"
        if a.from_file or a.reuse_last_run:
            rows, source = (json.load(open(a.from_file)) if a.from_file else fetch_raw(code, True)), "search"
        else:
            try:
                flyers = grocery_flyers(code, locale=os.environ.get("LOCALE", "en-ca"))
                detailed = add_item_details(flyers)
                rows = flyer_rows(flyers)
                notice(f"{code}: item details for {detailed} of {len(rows)}", sample_detail(flyers))
            except Exception as e:
                print(f"{code}: Flipp flyer feed failed ({e})")
                rows = []
            notice(f"{code}: {len(flyers)} flyers, {len(rows)} items", sample_keys(flyers))
            if len(rows) < MIN_FLYER_ROWS:
                print(f"{code}: only {len(rows)} flyer items, falling back to the search actor")
                rows, source = fetch_raw(code), "search"
        deals = build_deals(rows)
        print(f"{code}: {len(rows)} rows -> {len(deals)} deals from {source} for {', '.join(fsas)}")
        try:
            index = clip_index(flyers or grocery_flyers(code, {d["merchant"] for d in deals}))
            matched = attach_clips(deals, index)
            print(f"{code}: flyer clippings for {matched} of {len(deals)} deals")
        except Exception as e:  # clippings are a nice-to-have; keep the deals either way
            print(f"{code}: no flyer clippings ({e})")
        notice(f"{code}: {len(deals)} deals from {source}", json.dumps({
            "perWeight": sum(1 for d in deals if d["unit"]),
            "multiBuy": sum(1 for d in deals if d["bundleQty"] > 1),
            "withSavings": sum(1 for d in deals if d["savings"]),
            "withClip": sum(1 for d in deals if d.get("clip")),
            "merchants": sorted({d["merchant"] for d in deals}),
        }, ensure_ascii=False)[:900])
        for f in fsas:
            if a.dry_run:
                out[f] = deals
            else:
                write_firestore(code, f, deals, source)
    if a.dry_run:
        json.dump(out, open(a.dry_run, "w"), indent=2)


if __name__ == "__main__":
    main()
