"""Flyer Meal's recipe library: everyday meals people recognize, stored in the repo.

The app reads web/public/flyermeal/recipes.json and never calls a recipe API itself, so there's no
per-user quota to run out. That file is built from:

- TheMealDB's whole catalogue, cached in backend/data/mealdb_all.json. Each run only fetches
  recipes we don't have yet (search by first letter, 26 calls), so re-running is cheap.
- flyermeal_common.json: the TheMealDB dishes worth showing, by group. Most of the catalogue is
  regional (Algerian flatbreads, Norwegian cakes), so only named dishes make it into the app.
- flyermeal_swaps.json: store-bought sauce shortcuts for TheMealDB dishes that make their own.
- flyermeal_classics.json: everyday dinners TheMealDB lacks (spaghetti and meatballs, tacos,
  chili). Their photos come from each dish's Wikipedia article, with the photographer's credit
  and licence kept next to it, cached in backend/data/flyermeal_photos.json.

    python backend/flyermeal_recipes.py            # fetch new recipes and photos, rebuild
    python backend/flyermeal_recipes.py --refresh  # re-download TheMealDB's catalogue
    python backend/flyermeal_recipes.py --offline  # rebuild from the caches only
"""

import argparse
import html
import json
import re
import string
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "web" / "public" / "flyermeal" / "recipes.json"
CACHE = HERE / "data" / "mealdb_all.json"
PHOTOS = HERE / "data" / "flyermeal_photos.json"
COMMON = HERE / "flyermeal_common.json"
CLASSICS = HERE / "flyermeal_classics.json"
SWAPS = HERE / "flyermeal_swaps.json"
API = "https://www.themealdb.com/api/json/v1/1"
WIKI = "https://en.wikipedia.org"
UA = "FlyerMeal/0.2 (https://github.com/jtr4in/flyertorecipe)"

GROUPS = ["Pasta", "Chicken", "Beef", "Pork", "Seafood", "Vegetarian", "Soups & stews", "Breakfast", "Sides & salads", "Desserts"]


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode() or "{}")
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    return {}


def clean(meal: dict) -> dict:
    """TheMealDB's row (strIngredient1..20, strMeasure1..20) → our shape."""
    ingredients = []
    for i in range(1, 21):
        name = (meal.get(f"strIngredient{i}") or "").strip()
        if name:
            ingredients.append({"name": name, "measure": (meal.get(f"strMeasure{i}") or "").strip()})
    steps = [s.strip() for s in (meal.get("strInstructions") or "").replace("\r", "").split("\n")]
    # Drop the "STEP 1" / "1." lines some recipes put between paragraphs.
    steps = [s for s in steps if s and not re.fullmatch(r"(step\s*)?\d+[.):]?", s, re.I)]
    return {
        "id": f"mealdb:{meal['idMeal']}",
        "name": meal["strMeal"].strip(),
        "category": meal.get("strCategory") or "",
        "area": meal.get("strArea") or "",
        "image": meal.get("strMealThumb") or "",
        "tags": [t.strip() for t in (meal.get("strTags") or "").split(",") if t.strip()],
        "youtube": meal.get("strYoutube") or "",
        "source": meal.get("strSource") or "",
        "ingredients": ingredients,
        "steps": steps,
    }


def read(path: Path, empty):
    return json.loads(path.read_text()) if path.exists() else empty


def write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")


def harvest(refresh: bool = False) -> dict:
    """Bring the TheMealDB cache up to date."""
    data = {"meta": {}, "recipes": []} if refresh else read(CACHE, {"meta": {}, "recipes": []})
    have = {r["id"] for r in data["recipes"]}
    added = 0
    for letter in string.ascii_lowercase:
        for m in get(f"{API}/search.php?f={letter}").get("meals") or []:
            r = clean(m)
            if r["id"] not in have:
                data["recipes"].append(r)
                have.add(r["id"])
                added += 1
        time.sleep(0.3)
    data["recipes"].sort(key=lambda r: r["name"].lower())
    data["meta"] = {"source": "TheMealDB (https://www.themealdb.com)", "count": len(data["recipes"]),
                    "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    write(CACHE, data)
    print(f"TheMealDB: {added} new, {len(data['recipes'])} cached")
    return data


def strip_tags(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", text or ""))).strip()


def wiki_photo(title: str) -> dict | None:
    """The lead photo of a Wikipedia article, if it's freely licensed, with its credit."""
    summary = get(f"{WIKI}/api/rest_v1/page/summary/{urllib.parse.quote(title)}")
    src = (summary.get("originalimage") or summary.get("thumbnail") or {}).get("source")
    if not src:
        return None
    file = urllib.parse.unquote(src.split("/")[-1])
    if "/thumb/" in src:  # .../thumb/a/ab/Name.jpg/320px-Name.jpg → Name.jpg
        file = urllib.parse.unquote(src.split("/thumb/")[1].split("/")[2])
    q = urllib.parse.urlencode({"action": "query", "titles": f"File:{file}", "prop": "imageinfo", "iiprop": "url|extmetadata",
                                "iiurlwidth": 640, "format": "json", "formatversion": 2})
    pages = get(f"{WIKI}/w/api.php?{q}").get("query", {}).get("pages", [])
    info = (pages[0].get("imageinfo") or [{}])[0] if pages else {}
    meta = info.get("extmetadata") or {}
    licence = strip_tags((meta.get("LicenseShortName") or {}).get("value", ""))
    # Fair-use images (logos, film stills) can't be reused in an app; skip them.
    if not info.get("thumburl") or "NonFree" in meta or not licence or "fair use" in licence.lower():
        return None
    image = info["thumburl"]
    return {
        "image": image,
        "thumb": re.sub(r"/\d+px-", "/320px-", image),
        "credit": {
            "by": strip_tags((meta.get("Artist") or {}).get("value", "")) or "Unknown",
            "licence": licence,
            "url": info.get("descriptionurl", ""),
        },
    }


def photos(classics: list[dict], offline: bool) -> dict:
    cache = read(PHOTOS, {})
    for c in classics:
        title = c.get("wiki")
        if not title or title in cache or offline:
            continue
        try:
            cache[title] = wiki_photo(title)
        except Exception as e:  # one missing photo shouldn't stop the build
            print(f"  no photo for {title}: {e}")
            continue
        print(f"  photo {title}: {(cache[title] or {}).get('image', 'none')}")
        time.sleep(0.2)
    write(PHOTOS, cache)
    return cache


def build(catalogue: list[dict], offline: bool = False) -> dict:
    common = {k: v for k, v in read(COMMON, {}).items() if not k.startswith("_")}
    classics = read(CLASSICS, {"recipes": []})["recipes"]
    swaps = {k: v for k, v in read(SWAPS, {}).items() if not k.startswith("_")}
    pics = photos(classics, offline)
    by_name = {r["name"]: r for r in catalogue}
    out = []
    # Our classics are the dishes people look for first, so they lead each group; TheMealDB's
    # follow in the order flyermeal_common.json lists them.
    for c in classics:
        pic = pics.get(c.get("wiki")) or {}
        out.append({
            "id": f"f2r:{c['id']}", "name": c["name"], "group": c["group"], "emoji": c.get("emoji", ""),
            "image": pic.get("image", ""), "thumb": pic.get("thumb", ""), "credit": pic.get("credit"),
            "minutes": c.get("minutes"), "serves": c.get("serves"), "ingredients": c["ingredients"], "steps": c["steps"],
            "swaps": c.get("swaps", []),
        })
    for group, names in common.items():
        assert group in GROUPS, f"unknown group {group}"
        for name in names:
            r = by_name.get(name)
            if not r:
                print(f"  not in TheMealDB any more: {name}")
                continue
            out.append({
                "id": r["id"], "name": r["name"], "group": group, "area": r["area"],
                "image": r["image"], "thumb": f"{r['image']}/small" if r["image"] else "",
                "youtube": r["youtube"], "source": r["source"], "ingredients": r["ingredients"], "steps": r["steps"],
                "swaps": swaps.get(name, []),
            })
    for c in out:
        assert c["group"] in GROUPS, f"{c['name']}: unknown group {c['group']}"
        names = {i["name"] for i in c["ingredients"]}
        for s in c["swaps"]:
            missing = [n for n in s["replaces"] if n not in names]
            assert not missing, f"{c['name']}: swap replaces {missing}, not in its ingredients"
    unused = set(swaps) - {c["name"] for c in out}
    assert not unused, f"swaps for dishes not in the app: {unused}"
    data = {
        "meta": {"groups": GROUPS, "count": len(out), "sources": ["TheMealDB (https://www.themealdb.com)", "Flyer Meal classics"],
                 "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")},
        "recipes": out,
    }
    write(OUT, data)
    print(f"Built {len(out)} recipes ({len(classics)} classics, {sum(1 for c in out if c['image'])} with photos)")
    return data


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--refresh", action="store_true")
    p.add_argument("--offline", action="store_true")
    a = p.parse_args()
    catalogue = read(CACHE, {"recipes": []}) if a.offline else harvest(a.refresh)
    build(catalogue["recipes"], a.offline)
