import json
from pathlib import Path

import pytest

from staples import QUERY_LIMITS, SEARCH_BUDGET, STAPLE_QUERIES

# Found by a broader term's search: "cheese" returns mozzarella and feta, "fish fillets"
# returns tilapia and basa, "deli meat" returns sliced turkey and ham, "frozen meals" and "pasta"
# return the freezer and boxed shortcuts.
FOUND_BY_BROADER = {"mozzarella", "feta", "black beans", "white fish", "deli turkey or ham",
                    "Hamburger Helper", "instant noodles", "frozen meatballs", "chicken nuggets", "fish sticks", "perogies"}


def test_every_recipe_ingredient_has_a_search_term():
    path = Path(__file__).parent.parent / "catalog.json"
    if not path.exists():
        pytest.skip("catalog.json not exported")
    catalog = json.loads(path.read_text())
    terms = [q.lower() for q in STAPLE_QUERIES]
    missing = []
    for items in catalog.values():
        for i in items:
            words = [i["item"].lower(), *(m.lower() for m in i.get("match", []))]
            covered = any(t in w or w in t for t in terms for w in words)
            if not covered and i["item"] not in FOUND_BY_BROADER:
                missing.append(i["item"])
    assert missing == []


def test_no_duplicate_terms_and_budget_fits_the_charge_cap():
    assert len(STAPLE_QUERIES) == len(set(STAPLE_QUERIES))
    assert SEARCH_BUDGET * 0.002 + 0.0005 * len(QUERY_LIMITS) < 4.50
