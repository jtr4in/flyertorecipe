import json
from pathlib import Path

import pytest

import recipes_tool as rt

CATALOG = {
    "poultry": [{"item": "chicken thighs"}, {"item": "chicken breasts"}],
    "cookingVeg": [{"item": "broccoli"}, {"item": "carrots"}],
}


def recipe(**kw):
    r = {
        "id": "sheet-pan",
        "meal": "dinner",
        "name": "Sheet-pan {protein}[ with {veg}]",
        "minutes": 30,
        "slots": [
            {"key": "protein", "from": ["poultry"], "prefer": "chicken thighs", "main": True},
            {"key": "veg", "from": ["cookingVeg"], "optional": True},
        ],
        "steps": ["Roast the {protein} and {veg} at 425°F."],
        "tags": ["quick"],
        "vibes": ["comfort"],
    }
    r.update(kw)
    return r


def test_good_recipe_passes():
    assert rt.problems(recipe(), CATALOG, set()) == []


@pytest.mark.parametrize(
    "change, needle",
    [
        ({"id": "Sheet Pan"}, "id"),
        ({"meal": "brunch"}, "meal"),
        ({"name": "Sheet-pan {fish}"}, "fish"),
        ({"steps": ["Add the {sauce}."]}, "sauce"),
        ({"tags": ["fancy"]}, "tags"),
        ({"slots": [{"key": "protein", "from": ["seafood"]}]}, "seafood"),
        ({"slots": [{"key": "protein", "from": ["poultry"], "prefer": "salmon"}]}, "salmon"),
        ({"slots": [{"key": "protein", "from": ["poultry"], "only": ["tofu"]}]}, "tofu"),
        ({"slots": [{"key": "protein", "from": ["poultry"], "optional": True}]}, "required"),
    ],
)
def test_bad_recipes_are_caught(change, needle):
    errs = rt.problems(recipe(**change), CATALOG, set())
    assert errs and needle in " ".join(errs)


def test_duplicate_id():
    assert rt.problems(recipe(), CATALOG, {"sheet-pan"})


def test_bundled_recipes_fit_the_catalog():
    catalog = Path(rt.CATALOG)
    if not catalog.exists():
        pytest.skip("catalog.json not exported")
    cat, seen = json.loads(catalog.read_text()), set()
    for r in rt.load_recipes():
        assert rt.problems(r, cat, seen) == [], r["id"]
        seen.add(r["id"])
