"""Flyer Meal's recipe library: everyday meals people recognize, stored in the repo.

The app reads web/public/flyermeal/recipes.json and never calls a recipe API itself, so there's no
per-user quota to run out. That file is built from:

- TheMealDB's whole catalogue, cached in backend/data/mealdb_all.json. Each run only fetches
  recipes we don't have yet (search by first letter, 26 calls), so re-running is cheap.
- flyermeal_common.json: the TheMealDB dishes worth showing, by group. Most of the catalogue is
  regional (Algerian flatbreads, Norwegian cakes), so only named dishes make it into the app.
- flyermeal_swaps.json: store-bought sauce shortcuts for TheMealDB dishes that make their own.
- flyermeal_classics.json: everyday dinners TheMealDB lacks (spaghetti and meatballs, tacos,
  chili). Each photo is a freely licensed Wikimedia Commons file: the one a classic names in
  "photo", else the lead image of its Wikipedia article. The photographer's credit and licence
  are kept with it, cached in backend/data/flyermeal_photos.json.

    python backend/flyermeal_recipes.py            # fetch new recipes and photos, rebuild
    python backend/flyermeal_recipes.py --refresh  # re-download TheMealDB's catalogue
    python backend/flyermeal_recipes.py --offline  # rebuild from the caches only
    python backend/flyermeal_recipes.py --candidates  # list Commons photos to choose from
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
COMMONS = "https://commons.wikimedia.org"
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


def commons_photo(file: str) -> dict | None:
    """A freely licensed Wikimedia Commons photo at two sizes, with its credit."""
    q = urllib.parse.urlencode({"action": "query", "titles": f"File:{file}", "prop": "imageinfo", "iiprop": "url|extmetadata",
                                "iiurlwidth": 960, "format": "json", "formatversion": 2})
    pages = get(f"{COMMONS}/w/api.php?{q}").get("query", {}).get("pages", [])
    info = (pages[0].get("imageinfo") or [{}])[0] if pages else {}
    meta = info.get("extmetadata") or {}
    licence = strip_tags((meta.get("LicenseShortName") or {}).get("value", ""))
    nonfree = str((meta.get("NonFree") or {}).get("value", "")).lower() in ("true", "1")
    if not info.get("thumburl") or nonfree or not licence or "fair use" in licence.lower():
        print(f"    skip {file}: {'not on Commons' if not info else 'non-free' if nonfree else 'no licence'}")
        return None
    # Commons serves thumbnails at set widths (330, 500, 960...), so ask for those exactly.
    image = info["thumburl"].split("?")[0]
    return {
        "file": file,
        "image": image,
        "thumb": re.sub(r"/\d+px-", "/330px-", image),
        "credit": {
            "by": strip_tags((meta.get("Artist") or {}).get("value", "")) or "Unknown",
            "licence": licence,
            "url": info.get("descriptionurl", ""),
        },
    }


def lead_file(title: str) -> str | None:
    """The file name of a Wikipedia article's lead image."""
    q = urllib.parse.urlencode({"action": "query", "titles": title, "prop": "pageimages", "piprop": "name", "redirects": 1,
                                "format": "json", "formatversion": 2})
    pages = get(f"{WIKI}/w/api.php?{q}").get("query", {}).get("pages", [])
    return pages[0].get("pageimage") if pages else None


def photo_for(c: dict) -> dict | None:
    """A classic's photo: the Commons file it names, else its Wikipedia article's lead image."""
    file = c.get("photo") or (c.get("wiki") and lead_file(c["wiki"]))
    if not file:
        print(f"    no lead image for {c.get('wiki')}")
        return None
    return commons_photo(file)


def photos(classics: list[dict], offline: bool) -> dict:
    """Photos by classic id. Misses aren't cached, so the next run tries again."""
    cache = read(PHOTOS, {})
    for c in classics:
        want = c.get("photo") or c.get("wiki")
        have = cache.get(c["id"])
        if not want or offline or (have and have.get("from") == want):
            continue
        try:
            pic = photo_for(c)
        except Exception as e:  # one missing photo shouldn't stop the build
            print(f"  no photo for {c['name']}: {e}")
            continue
        if pic:
            cache[c["id"]] = {**pic, "from": want}
        print(f"  {c['name']}: {pic['file'] if pic else 'no photo'}")
        time.sleep(0.3)
    write(PHOTOS, cache)
    return cache


def candidates(classics: list[dict]) -> None:
    """Print freely licensed Commons photos for each classic, to pick a better one by name."""
    for c in classics:
        q = urllib.parse.urlencode({"action": "query", "generator": "search", "gsrnamespace": 6, "gsrlimit": 10,
                                    "gsrsearch": f"{c.get('search', c['name'])} filetype:bitmap", "prop": "imageinfo",
                                    "iiprop": "extmetadata|size", "format": "json", "formatversion": 2})
        pages = get(f"{COMMONS}/w/api.php?{q}").get("query", {}).get("pages", [])
        print(f"## {c['id']} ({c['name']})")
        for pg in sorted(pages, key=lambda p: p.get("index", 99)):
            info = (pg.get("imageinfo") or [{}])[0]
            lic = strip_tags(((info.get("extmetadata") or {}).get("LicenseShortName") or {}).get("value", ""))
            print(f"   {pg['title'][5:]} | {info.get('width')}x{info.get('height')} | {lic}")
        time.sleep(0.3)


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
        pic = pics.get(c["id"]) or {}
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
    p.add_argument("--candidates", action="store_true", help="list Commons photos for each classic and stop")
    a = p.parse_args()
    if a.candidates:
        candidates(read(CLASSICS, {"recipes": []})["recipes"])
        raise SystemExit
    catalogue = read(CACHE, {"recipes": []}) if a.offline else harvest(a.refresh)
    build(catalogue["recipes"], a.offline)
