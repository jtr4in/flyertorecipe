"""Find each deal's ad on the actual flyer page, so the app can show the cashier the real
clipping (product, price and fine print) instead of just the product photo.

Flipp serves each flyer as one wide canvas (pages side by side) cut into 256 px tiles,
and lists every item's box on that canvas. The Apify rows only carry the item's cutout
image URL, so we match on the page_items id inside it. The app draws the clipping from the
tiles directly (see web/src/components/FlyerClip.jsx); nothing is downloaded or stored here.
"""

from __future__ import annotations

import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "https://backflipp.wishabi.com/flipp"
PAGE_ITEM = re.compile(r"/page_items/(\d+)/")


def _get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (flyer2recipes)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def page_item_id(url: str | None) -> str | None:
    m = PAGE_ITEM.search(url or "")
    return m.group(1) if m else None


def _box(o: dict) -> tuple[float, float, float, float]:
    """Flipp boxes use y going up from 0 at the top edge; return (left, top, right, bottom)
    with y going down, like an image."""
    return (o["left"], -o["top"], o["right"], -o["bottom"])


def _union(boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def clip_boxes(items: list[dict], pages: list[dict]) -> dict[str, tuple[float, float, float, float]]:
    """page_item id -> box of the whole ad: the item, its price text, and the other products
    sold under the same name right next to it ("Villaggio, Dempster's or bagels $2.99")."""
    out = {}
    for it in items:
        pid = page_item_id(it.get("cutout_image_url"))
        if not pid:
            continue
        base = _box(it)
        cx, cy = (base[0] + base[2]) / 2, (base[1] + base[3]) / 2
        boxes = [base] + [_box(t) for t in it.get("text_areas") or []]
        for other in items:
            if other is it or other.get("name") != it.get("name"):
                continue
            ob = _box(other)
            if abs((ob[0] + ob[2]) / 2 - cx) < 600 and abs((ob[1] + ob[3]) / 2 - cy) < 600:
                boxes += [ob] + [_box(t) for t in other.get("text_areas") or []]
        l, t, r, b = _union(boxes)
        pad = 0.06 * max(r - l, b - t) + 8
        l, t, r, b = l - pad, t - pad, r + pad, b + pad
        # Stay on the item's own page.
        for p in pages:
            pl, pt, pr, pb = _box(p)
            if pl <= cx <= pr:
                l, t, r, b = max(l, pl), max(t, pt), min(r, pr), min(b, pb)
                break
        out[pid] = tuple(round(v, 1) for v in (l, t, r, b))
    return out


def grocery_flyers(postal_code: str, merchants: set[str] | None = None, locale: str = "en-ca") -> list[tuple[dict, dict]]:
    """(flyer, detail) for the area's grocery flyers, plus any other flyer from `merchants`
    (pharmacies carry groceries too). The detail lists every item on the flyer."""
    pc = postal_code.replace(" ", "").upper()
    flyers = _get(f"{API}/data?locale={locale}&postal_code={pc}").get("flyers", [])
    out = []
    for f in flyers:
        wanted = "Groceries" in (f.get("categories") or []) or f.get("merchant") in (merchants or set())
        if not wanted or not f.get("path"):
            continue
        try:
            out.append((f, _get(f"{API}/flyers/{f['id']}")))
        except Exception as e:  # one broken flyer shouldn't stop the run
            print(f"  flyer {f['id']} ({f.get('merchant')}): {e}")
    return out


def clip_index(flyers: list[tuple[dict, dict]]) -> dict[str, dict]:
    """page_item id -> {clip, flyerId, flippItemId} for the given flyers."""
    index: dict[str, dict] = {}
    for f, detail in flyers:
        boxes = clip_boxes(detail.get("items", []), detail.get("pages", []))
        by_pid = {page_item_id(i.get("cutout_image_url")): i for i in detail.get("items", [])}
        for pid, box in boxes.items():
            index[pid] = {
                "flyerId": f["id"],
                "flippItemId": by_pid[pid]["id"],
                "clip": {
                    "base": "https://f.wishabi.net/" + f["path"],
                    "res": f.get("resolutions") or [1.0],
                    "h": f.get("height"),
                    "box": list(box),
                },
            }
    return index


def flyer_index(postal_code: str, merchants: set[str] | None = None, locale: str = "en-ca") -> dict[str, dict]:
    return clip_index(grocery_flyers(postal_code, merchants, locale))


def _text(*parts) -> str:
    return " ".join(str(p).strip() for p in parts if p not in (None, "") and str(p).strip())


def _price(v) -> str | None:
    """'4.99', '$4.99', '4,99', '2.99/lb' -> '4.99'-style string; None when there's no number."""
    m = re.search(r"\d+(?:[.,]\d{1,2})?", str(v))
    return m.group(0).replace(",", ".") if m else None


# The flyer's item list has name and price only; each item's own page adds "/lb" (price_text),
# "2/" (pre_price_text), "SAVE $2", the regular price and the size ("1KG" in description).
DETAIL_KEYS = ("pre_price_text", "price_text", "post_price_text", "sale_story", "original_price",
               "current_price", "percent_off", "description")


def add_item_details(flyers: list[tuple[dict, dict]], workers: int = 8) -> int:
    """Fill DETAIL_KEYS on every named, priced flyer item in place; returns how many worked."""
    items = [it for _, d in flyers for it in d.get("items", []) if it.get("name") and it.get("price") not in (None, "")]

    def one(it):
        try:
            got = _get(f"{API}/items/{it['id']}")
        except Exception:
            return False
        got = got.get("item", got) if isinstance(got, dict) else {}
        for k in DETAIL_KEYS:
            if got.get(k) not in (None, ""):
                it[k] = got[k]
        return True

    with ThreadPoolExecutor(workers) as pool:
        return sum(pool.map(one, items))


def _name(it: dict) -> str:
    """'Natrel' + 'Milk' + '4 L' -> 'Natrel Milk, 4 L': brand and size only when the name lacks them."""
    name = str(it["name"]).strip()
    brand, size = str(it.get("brand") or "").strip(), str(it.get("description") or "").strip()
    if brand and brand.lower() not in name.lower():
        name = f"{brand} {name}"
    if size and len(size) <= 30 and size.lower() not in name.lower():
        name = f"{name}, {size}"
    return name


def flyer_rows(flyers: list[tuple[dict, dict]]) -> list[dict]:
    """Every priced item on the flyers, shaped like the search actor's rows so normalize()
    reads both: "2/" + "5.00" + "ea." becomes currentPrice 5.00, priceText "2/ ea."."""
    rows = []
    for f, detail in flyers:
        for it in detail.get("items", []):
            price = it.get("current_price") if it.get("current_price") not in (None, "") else it.get("price")
            if not it.get("name") or price in (None, ""):
                continue
            story = _text(it.get("sale_story"))
            pct = it.get("percent_off") or it.get("discount")
            if not story and isinstance(pct, (int, float)) and 0 < pct < 90:
                story = f"SAVE {int(pct)}%"
            rows.append({
                "dealId": f"f{it.get('id')}",
                "name": _name(it),
                "merchant": f.get("merchant"),
                "currentPrice": _price(price),
                "originalPrice": it.get("original_price"),
                "priceText": _text(it.get("pre_price_text"), it.get("price_text"), it.get("post_price_text")),
                "saleStory": story or None,
                "imageUrl": it.get("cutout_image_url"),
                "validFrom": it.get("valid_from") or f.get("valid_from"),
                "validTo": it.get("valid_to") or f.get("valid_to"),
                "flyerId": f.get("id"),
            })
    return rows


def attach_clips(deals: list[dict], index: dict[str, dict]) -> int:
    """Add clip info to deals in place; returns how many matched."""
    n = 0
    for d in deals:
        hit = index.get(page_item_id(d.get("imageUrl")))
        if hit:
            d.update(hit)
            n += 1
    return n
