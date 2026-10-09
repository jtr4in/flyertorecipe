"""Manage the shared recipe list (web/src/data/recipes.json).

    python recipes_tool.py seed                      # copy recipes.json into Firestore recipes/
    python recipes_tool.py draft --count 6 [--meal dinner] [--theme "slow cooker"]
    python recipes_tool.py steps                     # write methods for recipes that have none
    python recipes_tool.py check                     # validate recipes.json only

Recipes are ordinary recipes whose swappable ingredients are slots (see web/src/data/templates.js):
"prefer" is what the recipe normally uses, "from" the catalog groups it may swap to when
something else is on sale. `draft` and `steps` ask Claude to write them, then every result is
checked against the ingredient catalog before it is added; a person reviews the pull request.

The catalog comes from web/src/data/ingredients.js, exported to JSON by the workflow:
    node -e "import('./web/src/data/ingredients.js').then(m => console.log(JSON.stringify(m.CATALOG)))" > backend/catalog.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECIPES = ROOT / "web" / "src" / "data" / "recipes.json"
CATALOG = Path(__file__).resolve().parent / "catalog.json"
MODEL = "claude-opus-5-5"
MEALS = ["breakfast", "lunch", "dinner", "snack"]
TAGS = ["quick", "kid-approved", "big-batch"]
VIBES = ["healthy", "light", "comfort", "sweet", "savoury"]


def load_recipes() -> list[dict]:
    return json.loads(RECIPES.read_text())


def save_recipes(recipes: list[dict]) -> None:
    RECIPES.write_text(json.dumps(recipes, indent=1, ensure_ascii=False) + "\n")


def load_catalog() -> dict[str, list[dict]]:
    return json.loads(CATALOG.read_text())


# ---------- Validation ----------

def problems(r: dict, catalog: dict, taken: set[str]) -> list[str]:
    """Everything wrong with one recipe; empty when it can go in."""
    out = []
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", r.get("id", "")):
        out.append("id must be kebab-case")
    elif r["id"] in taken:
        out.append(f"id {r['id']} already exists")
    if r.get("meal") not in MEALS:
        out.append(f"meal must be one of {MEALS}")
    if not isinstance(r.get("minutes"), int) or not 1 <= r["minutes"] <= 240:
        out.append("minutes must be 1-240")
    slots = r.get("slots") or []
    if not slots:
        out.append("no slots")
    keys = [s.get("key") for s in slots]
    if len(set(keys)) != len(keys):
        out.append("duplicate slot keys")
    for s in slots:
        groups = s.get("from") or []
        bad = [g for g in groups if g not in catalog]
        if not groups or bad:
            out.append(f"slot {s.get('key')}: unknown groups {bad or 'none'}")
            continue
        items = {i["item"] for g in groups for i in catalog[g]}
        for field in ("only", "exclude"):
            unknown = [x for x in s.get(field) or [] if x not in items]
            if unknown:
                out.append(f"slot {s['key']}: {field} has items not in its groups: {unknown}")
        if s.get("prefer") and s["prefer"] not in items:
            out.append(f"slot {s['key']}: prefer {s['prefer']!r} is not in its groups")
        if s.get("only") and s.get("prefer") and s["prefer"] not in s["only"]:
            out.append(f"slot {s['key']}: prefer is not in only")
    if not any(not s.get("optional") for s in slots):
        out.append("needs at least one required slot")
    for text in [r.get("name", "")] + list(r.get("steps") or []):
        for k in re.findall(r"\{(\w+)\}", text):
            if k not in keys:
                out.append(f"placeholder {{{k}}} is not a slot")
    if not r.get("name"):
        out.append("no name")
    for field, allowed in (("tags", TAGS), ("vibes", VIBES)):
        if any(x not in allowed for x in r.get(field) or []):
            out.append(f"{field} must be from {allowed}")
    return out


def tidy(r: dict) -> dict:
    """Drop empty optional fields so recipes.json stays readable."""
    slots = []
    for s in r["slots"]:
        s = {k: v for k, v in s.items() if v not in (None, "", [], False) and not (k == "qty" and v == 1)}
        slots.append(s)
    keep = ["id", "meal", "name", "emoji", "minutes", "slots", "pantry", "tags", "vibes", "steps"]
    return {k: (slots if k == "slots" else r.get(k, [] if k in ("pantry", "tags", "vibes", "steps") else None)) for k in keep}


# ---------- Claude ----------

SLOT_SCHEMA = {
    "type": "object",
    "properties": {
        "key": {"type": "string", "description": "short lowercase name used in {placeholders}, e.g. protein, veg, starch"},
        "from": {"type": "array", "items": {"type": "string"}, "description": "catalog groups this ingredient may swap within"},
        "prefer": {"type": "string", "description": "the catalog item the recipe normally uses (exact item name)"},
        "only": {"type": "array", "items": {"type": "string"}, "description": "limit to these exact items; empty for the whole groups"},
        "exclude": {"type": "array", "items": {"type": "string"}, "description": "exact items that don't suit this recipe"},
        "qty": {"type": "number", "description": "multiplier on the catalog's per-serving amount; 1 for normal"},
        "main": {"type": "boolean", "description": "true for the protein that defines the dish"},
        "optional": {"type": "boolean", "description": "true if the dish works without it (only bought when on sale)"},
    },
    "required": ["key", "from", "prefer", "only", "exclude", "qty", "main", "optional"],
    "additionalProperties": False,
}
RECIPE_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "meal": {"type": "string", "enum": MEALS},
        "name": {"type": "string"},
        "emoji": {"type": "string"},
        "minutes": {"type": "integer"},
        "slots": {"type": "array", "items": SLOT_SCHEMA},
        "pantry": {"type": "array", "items": {"type": "string"}},
        "tags": {"type": "array", "items": {"type": "string", "enum": TAGS}},
        "vibes": {"type": "array", "items": {"type": "string", "enum": VIBES}},
        "steps": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["id", "meal", "name", "emoji", "minutes", "slots", "pantry", "tags", "vibes", "steps"],
    "additionalProperties": False,
}

RULES = """How these recipes work:
- Each recipe is a normal home recipe. Every ingredient a grocery flyer could discount is a slot.
  A slot has `prefer` (what the recipe normally uses) and `from` (catalog groups it can sensibly
  swap to when something else is on sale). Use `only` to keep swaps sensible (a stir-fry starch
  is rice or noodles, not potatoes) and `exclude` for items that would be wrong.
- Spices, oil, sauces, garlic, onion, flour, sugar and condiments go in `pantry`, not slots.
- `name` uses {slot} placeholders so it reads right whatever gets swapped in, e.g.
  "{protein} & {veg} stir-fry over {starch}". Wrap a part in [ ] if it should only appear when an
  optional slot is filled: "Big {protein} salad with {veg}[ & {veg2}]". Write it in sentence case.
- `steps` are 3-6 short, practical method lines that may use the same placeholders.
- Quantities come from the catalog per serving; set qty only when the recipe needs noticeably more
  or less (0.5, 1.5). Items must be exact catalog item names, groups exact group names.
- tags: quick (25 min or less), kid-approved, big-batch (reheats well, good for leftovers).
  vibes: healthy, light, comfort, sweet, savoury (pick the ones that fit)."""


def catalog_text(catalog: dict) -> str:
    lines = []
    for g, items in catalog.items():
        lines.append(f"{g}: " + ", ".join(f"{i['item']} ({i['unit']})" for i in items))
    return "\n".join(lines)


def ask(prompt: str, schema: dict, max_tokens: int = 32000) -> dict:
    import anthropic

    client = anthropic.Anthropic()
    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=max_tokens,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "high", "format": {"type": "json_schema", "schema": schema}},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        msg = stream.get_final_message()
    if msg.stop_reason == "refusal":
        sys.exit(f"Claude declined: {getattr(msg, 'stop_details', None)}")
    if msg.stop_reason == "max_tokens":
        sys.exit("Response was cut off; ask for fewer recipes")
    text = "".join(b.text for b in msg.content if b.type == "text")
    return json.loads(text)


def draft(count: int, meal: str | None, theme: str | None) -> None:
    recipes, catalog = load_recipes(), load_catalog()
    taken = {r["id"] for r in recipes}
    examples = [r for r in recipes if r["id"] in ("stir-fry", "big-salad", "overnight-oats")]
    prompt = f"""Write {count} new recipes for a Canadian household meal planner{f' for {meal}' if meal else ' across breakfast, lunch, dinner and snacks'}{f', with this theme: {theme}' if theme else ''}.
Pick well-known, everyday dishes people actually cook on a weeknight, not ones already in the list.

{RULES}

Ingredient catalog (group: items):
{catalog_text(catalog)}

Recipes already in the list (don't repeat these dishes):
{", ".join(sorted(f"{r['id']} ({r['name']})" for r in recipes))}

Examples of the format:
{json.dumps(examples, indent=1, ensure_ascii=False)}"""
    schema = {"type": "object", "properties": {"recipes": {"type": "array", "items": RECIPE_SCHEMA}}, "required": ["recipes"], "additionalProperties": False}
    added, rejected = [], []
    for r in ask(prompt, schema)["recipes"]:
        errs = problems(r, catalog, taken)
        if errs:
            rejected.append((r.get("id"), errs))
            continue
        r = tidy(r)
        taken.add(r["id"])
        added.append(r)
    save_recipes(recipes + added)
    report(added, rejected)


def steps() -> None:
    recipes, catalog = load_recipes(), load_catalog()
    todo = [r for r in recipes if not r.get("steps")]
    if not todo:
        print("Every recipe already has steps.")
        return
    prompt = f"""For each recipe below, write 3-6 short, practical method steps a home cook can follow.
Use the recipe's {{slot}} placeholders where the ingredient goes (the app fills in whatever is on
sale that week), and keep steps true for any item the slot allows. Pantry items can be named directly.

{json.dumps([{k: r[k] for k in ("id", "name", "minutes", "slots", "pantry")} for r in todo], indent=1, ensure_ascii=False)}"""
    schema = {
        "type": "object",
        "properties": {"recipes": {"type": "array", "items": {
            "type": "object",
            "properties": {"id": {"type": "string"}, "steps": {"type": "array", "items": {"type": "string"}}},
            "required": ["id", "steps"], "additionalProperties": False}}},
        "required": ["recipes"], "additionalProperties": False,
    }
    by_id = {r["id"]: r for r in recipes}
    added, rejected = [], []
    for s in ask(prompt, schema)["recipes"]:
        r = by_id.get(s["id"])
        if not r or r.get("steps"):
            continue
        errs = problems({**r, "steps": s["steps"]}, catalog, set())
        if errs or not s["steps"]:
            rejected.append((s["id"], errs or ["no steps"]))
            continue
        r["steps"] = s["steps"]
        added.append(r)
    save_recipes(recipes)
    report(added, rejected, verb="Wrote steps for")


def report(added, rejected, verb="Added") -> None:
    lines = [f"{verb} {len(added)} recipe(s):"] + [f"- {r['meal']}: {r['name']} ({r['id']})" for r in added]
    if rejected:
        lines += [f"Rejected {len(rejected)} that didn't fit the catalog:"] + [f"- {i}: {'; '.join(e)}" for i, e in rejected]
    text = "\n".join(lines)
    print(text)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        Path(os.environ["GITHUB_STEP_SUMMARY"]).write_text(text + "\n")
    Path(ROOT / "recipe-report.md").write_text(text + "\n")


def check() -> None:
    recipes, catalog = load_recipes(), load_catalog()
    seen, bad = set(), 0
    for r in recipes:
        errs = problems(r, catalog, seen)
        seen.add(r.get("id"))
        if errs:
            bad += 1
            print(f"{r.get('id')}: {'; '.join(errs)}")
    print(f"{len(recipes)} recipes, {bad} with problems")
    sys.exit(1 if bad else 0)


def seed() -> None:
    import firebase_admin
    from firebase_admin import firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    db = firestore.client()
    recipes = load_recipes()
    col = db.collection("recipes")
    keep = {r["id"] for r in recipes}
    stale = [d.reference for d in col.stream() if d.id not in keep]
    batch = db.batch()
    for r in recipes:
        batch.set(col.document(r["id"]), r)
    for ref in stale:
        batch.delete(ref)
    batch.commit()
    print(f"Seeded {len(recipes)} recipes, removed {len(stale)}")


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("draft")
    d.add_argument("--count", type=int, default=6)
    d.add_argument("--meal", choices=MEALS)
    d.add_argument("--theme")
    sub.add_parser("steps")
    sub.add_parser("check")
    sub.add_parser("seed")
    a = p.parse_args()
    if a.cmd == "draft":
        draft(a.count, a.meal, a.theme)
    else:
        {"steps": steps, "check": check, "seed": seed}[a.cmd]()


if __name__ == "__main__":
    main()
