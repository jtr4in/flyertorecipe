"""Print raw rows from the actor's last successful run (no new run, no charge).

    python inspect_last_run.py [N]
"""
import json
import os
import sys

from apify_client import ApifyClient

from ingest import ACTOR_ID

n = int(sys.argv[1]) if len(sys.argv) > 1 else 80
client = ApifyClient(os.environ["APIFY_TOKEN"])
dataset = client.actor(ACTOR_ID).last_run(status="SUCCEEDED").dataset()
for row in dataset.iterate_items(limit=n):
    print(json.dumps({k: row.get(k) for k in (
        "query", "name", "merchant", "currentPrice", "originalPrice", "priceText", "saleStory", "category", "imageUrl", "validFrom", "validTo",
    )}, ensure_ascii=False))
