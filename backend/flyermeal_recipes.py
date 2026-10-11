"""Flyer Meal's recipe library: TheMealDB's catalogue, downloaded once and kept in the repo.

The app reads web/public/flyermeal/recipes.json and never calls the recipe API itself, so there's
no per-user quota to run out. Each run only fetches recipes we don't have yet (search by first
letter, 26 calls for the whole catalogue), so re-running it is cheap.

    python backend/flyermeal_recipes.py            # add new recipes
    python backend/flyermeal_recipes.py --refresh  # re-download everything
"""

import argparse
import json
import re
import string
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "flyermeal" / "recipes.json"
API = "https://www.themealdb.com/api/json/v1/1"


def get(path: str) -> dict:
    req = urllib.request.Request(f"{API}/{path}", headers={"User-Agent": "FlyerMeal/0.1"})
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


def load() -> dict:
    if OUT.exists():
        return json.loads(OUT.read_text())
    return {"meta": {}, "recipes": []}


def harvest(refresh: bool = False) -> int:
    data = {"meta": {}, "recipes": []} if refresh else load()
    have = {r["id"] for r in data["recipes"]}
    added = 0
    calls = 0
    for letter in string.ascii_lowercase:
        meals = get(f"search.php?f={letter}").get("meals") or []
        calls += 1
        for m in meals:
            r = clean(m)
            if r["id"] not in have:
                data["recipes"].append(r)
                have.add(r["id"])
                added += 1
        time.sleep(0.3)
    data["recipes"].sort(key=lambda r: r["name"].lower())
    data["meta"] = {
        "source": "TheMealDB (https://www.themealdb.com)",
        "count": len(data["recipes"]),
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "apiCalls": calls,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{added} new recipes, {len(data['recipes'])} total, {calls} API calls")
    return added


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--refresh", action="store_true")
    harvest(p.parse_args().refresh)
