"""Turn raw actor rows into the deal documents the web app reads.

Pure functions only, so they can be unit-tested without Apify or Firebase."""

from __future__ import annotations

import re
from datetime import datetime, timezone

# Aisle order is the order the shopping list is printed in. Keep in sync with
# web/src/lib/aisles.js.
AISLE_KEYWORDS: list[tuple[str, list[str]]] = [
    ("Produce", ["apple", "banana", "berr", "grape", "orange", "lemon", "lime", "potato",
                 "onion", "carrot", "broccoli", "pepper", "tomato", "spinach", "lettuce",
                 "cucumber", "celery", "garlic", "mushroom", "zucchini", "cauliflower",
                 "avocado", "kale", "squash", "pear", "melon", "salad"]),
    ("Meat & Seafood", ["chicken", "beef", "pork", "turkey", "salmon", "shrimp", "fish",
                        "sausage", "bacon", "ham", "steak", "lamb", "tilapia", "cod", "tuna fillet"]),
    ("Dairy & Eggs", ["milk", "cheese", "yogurt", "yoghurt", "butter", "egg", "cream",
                      "cheddar", "mozzarella", "kefir"]),
    ("Bakery", ["bread", "bagel", "bun", "tortilla", "wrap", "pita", "naan", "muffin"]),
    ("Frozen", ["frozen"]),
    ("Pantry", ["rice", "pasta", "spaghetti", "noodle", "bean", "lentil", "chickpea",
                "canned", "soup", "oat", "cereal", "flour", "sugar", "oil", "sauce",
                "peanut butter", "tuna", "broth", "stock", "quinoa", "salsa"]),
    ("Plant Protein", ["tofu", "tempeh", "plant-based", "veggie burger"]),
]
AISLES = [a for a, _ in AISLE_KEYWORDS] + ["Other"]

_MULTIBUY = re.compile(r"(\d+)\s*(?:/|for)\s*\$?\s*(\d+(?:\.\d{1,2})?)", re.I)
_SAVE = re.compile(r"save\s*(?:up\s*to\s*)?\$\s*(\d+(?:\.\d{1,2})?)", re.I)


def fsa(postal_code: str) -> str:
    """Forward sortation area (first 3 chars), used as the region key."""
    pc = re.sub(r"\s+", "", postal_code or "").upper()
    if not re.fullmatch(r"[A-Z]\d[A-Z]\d[A-Z]\d", pc):
        raise ValueError(f"Not a Canadian postal code: {postal_code!r}")
    return pc[:3]


def aisle_for(name: str, actor_category: str | None = None) -> str:
    text = f"{name or ''}".lower()
    # "frozen" wins over the food word ("frozen broccoli" belongs in Frozen)
    if "frozen" in text:
        return "Frozen"
    for aisle, words in AISLE_KEYWORDS:
        if any(w in text for w in words):
            return aisle
    cat = (actor_category or "").lower()
    for aisle, words in AISLE_KEYWORDS:
        if any(w in cat for w in words):
            return aisle
    return "Other"


def multibuy_qty(price_text: str | None) -> int:
    """'2/$5' or '3 for $10' -> 2 / 3. Plain prices -> 1."""
    m = _MULTIBUY.search(price_text or "")
    return int(m.group(1)) if m and int(m.group(1)) > 1 else 1


def _num(v) -> float | None:
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


def normalize(row: dict, fetched_at: datetime | None = None) -> dict | None:
    """One actor row -> one deal doc, or None if it has no usable price."""
    current = _num(row.get("currentPrice"))
    if current is None or not row.get("name"):
        return None
    qty = multibuy_qty(row.get("priceText"))
    unit_price = round(current / qty, 2)  # actor keeps bundle totals in currentPrice
    regular = _num(row.get("originalPrice"))

    savings = None
    if regular and regular > unit_price:
        savings = round(regular - unit_price, 2)
    else:
        m = _SAVE.search(row.get("saleStory") or "")
        if m:
            savings = round(float(m.group(1)) / qty, 2)
            regular = regular or round(unit_price + savings, 2)

    return {
        "dealId": str(row.get("dealId")),
        "name": row["name"].strip(),
        "merchant": (row.get("merchant") or "").strip(),
        "price": unit_price,
        "bundleQty": qty,
        "priceText": row.get("priceText") or f"${current:.2f}",
        "regularPrice": regular,
        "savings": savings,  # per item; None when the flyer gives no regular price
        "aisle": aisle_for(row["name"], row.get("category")),
        "queries": [row["query"]] if row.get("query") else [],
        "validFrom": row.get("validFrom"),
        "validTo": row.get("validTo"),
        "imageUrl": row.get("imageUrl"),  # flyer clipping, shown for price matching
        "saleStory": row.get("saleStory"),
        "flyerId": row.get("flyerId"),
        "fetchedAt": (fetched_at or datetime.now(timezone.utc)).isoformat(),
    }


def dedupe(deals: list[dict]) -> list[dict]:
    """The same flyer item comes back for several search terms; merge them."""
    by_id: dict[str, dict] = {}
    for d in deals:
        if d["dealId"] in by_id:
            q = by_id[d["dealId"]]["queries"]
            q.extend(x for x in d["queries"] if x not in q)
        else:
            by_id[d["dealId"]] = d
    return list(by_id.values())
