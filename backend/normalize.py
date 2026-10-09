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

# Real flyer priceText is a qualifier, not a full price: "/lb", "EACH", "2 FOR",
# "$3.47 / 100 g", "prix membre /lb". The number itself is always in currentPrice.
# Bundle size: "2 FOR", "2/$5", "3 pour", "2/ OR $2.89 each". The lookbehind stops
# "$4.37/kg" or "$3.47 / 100 g" from reading as a 37- or 47-item bundle.
_MULTIBUY = re.compile(r"(?<![\d.,$])(\d{1,2})\s*(?:/|for\b|pour\b)(?!\s*(?:lb|kg|g\b|100|livre))", re.I)
_PER_100G = re.compile(r"(?:/|per|le|par)\s*100\s*g", re.I)
_PER_KG = re.compile(r"^\s*/\s*kg|(?<![\d.,$])/\s*kg\s*$", re.I)
_PER_LB = re.compile(r"/\s*lb|\blb\b|/\s*livre", re.I)
_MEMBER = re.compile(r"membre|member", re.I)
_NUM = r"(\d+(?:[.,]\d{1,2})?)"
_SAVE_AMOUNT = [
    re.compile(r"(?:save|économisez|economisez)\s*(?:up\s*to|jusqu'à)?\s*\$\s*" + _NUM, re.I),
    re.compile(r"(?:save|économisez|economisez)\s*(?:up\s*to|jusqu'à)?\s*" + _NUM + r"\s*\$", re.I),
    re.compile(_NUM + r"\s*\$\s*d'économie", re.I),
]
_SAVE_PCT = [
    re.compile(r"(\d{1,2})\s*%\s*(?:off|de rabais|savings|d'économie)", re.I),
    re.compile(r"save\s*(\d{1,2})\s*%", re.I),
]


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
    """'2/$5', '2 FOR', '3 for $10' -> 2 / 2 / 3. Plain or per-weight prices -> 1."""
    m = _MULTIBUY.search(price_text or "")
    return int(m.group(1)) if m and 1 < int(m.group(1)) <= 12 else 1


def price_unit(price_text: str | None) -> str:
    """The unit currentPrice is quoted in: '/lb', '/100 g', '/kg' or '' (each/package)."""
    t = price_text or ""
    m = _PER_100G.search(t)
    # "$3.47 / 100 g" next to a $20.50 package price is just a comparison price;
    # "le 100 g 11,75$/lb" or "per 100 g" means currentPrice itself is per 100 g.
    if m and not re.search(r"\$\s*\d", t[: m.start()]):
        return "/100 g"
    if _PER_LB.search(t):
        return "/lb"
    if _PER_KG.search(t):
        return "/kg"
    return ""


def _money(text: str) -> float:
    return float(text.replace(",", "."))


def savings_from_story(story: str | None, unit_price: float, qty: int) -> float | None:
    """'SAVE $2', 'ÉCONOMISEZ 2,50$', '1,16$ d'économie', 'SAVE 43%', '33% OFF'. Points offers -> None."""
    s = story or ""
    for rx in _SAVE_AMOUNT:
        m = rx.search(s)
        if m:
            return round(_money(m.group(1)) / qty, 2)
    for rx in _SAVE_PCT:
        m = rx.search(s)
        if m:
            pct = int(m.group(1)) / 100
            return round(unit_price / (1 - pct) - unit_price, 2)
    return None


def _num(v) -> float | None:
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


# Flyers the actor returns that aren't grocery shopping (restaurants, pet, home goods).
EXCLUDED_MERCHANTS = {"harvey's", "subway", "pet valu", "stokes", "rossy", "on the run",
                      "nature's source and nature's signature"}


def normalize(row: dict, fetched_at: datetime | None = None) -> dict | None:
    """One actor row -> one deal doc, or None if it has no usable price."""
    current = _num(row.get("currentPrice"))
    if current is None or not row.get("name"):
        return None
    if (row.get("merchant") or "").strip().lower() in EXCLUDED_MERCHANTS:
        return None
    text = row.get("priceText") or ""
    qty = multibuy_qty(text)
    unit_price = round(current / qty, 2)  # actor keeps bundle totals in currentPrice
    unit = price_unit(text)

    # originalPrice is sometimes quoted in a different unit (per kg vs per 100 g),
    # so only trust it when it's a plausible regular price for this one.
    regular = _num(row.get("originalPrice"))
    if regular and not (unit_price < regular < unit_price * 2):
        regular = None
    savings = round(regular - unit_price, 2) if regular else None
    if savings is None:
        savings = savings_from_story(row.get("saleStory"), unit_price, qty)
        if savings is not None and not (0 < savings < unit_price):
            savings = None
        if savings:
            regular = round(unit_price + savings, 2)

    label = f"{qty} for ${current:.2f}" if qty > 1 else f"${current:.2f}{unit}"
    if _MEMBER.search(text):
        label += " (member price)"

    return {
        "dealId": str(row.get("dealId")),
        "name": row["name"].strip(),
        "merchant": (row.get("merchant") or "").strip(),
        "price": unit_price,
        "bundleQty": qty,
        "unit": unit,
        "priceLabel": label,  # what the app shows, e.g. "$4.99/lb", "2 for $7.00"
        "priceText": text,  # the flyer's raw qualifier, kept for reference
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
