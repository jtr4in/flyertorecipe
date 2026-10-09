import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from normalize import aisle_for, dedupe, fsa, multibuy_qty, normalize  # noqa: E402


def test_fsa():
    assert fsa("m5v 2t6") == "M5V"
    with pytest.raises(ValueError):
        fsa("90210")


@pytest.mark.parametrize("text,qty", [("2/$5", 2), ("3 for $10", 3), ("$3.99", 1), (None, 1), ("1/$4", 1)])
def test_multibuy(text, qty):
    assert multibuy_qty(text) == qty


@pytest.mark.parametrize("name,aisle", [
    ("Boneless Chicken Breast", "Meat & Seafood"),
    ("Frozen Broccoli Florets", "Frozen"),
    ("Large Eggs 12pk", "Dairy & Eggs"),
    ("Romaine Lettuce", "Produce"),
    ("Firm Tofu", "Plant Protein"),
    ("Dish Soap", "Other"),
])
def test_aisle(name, aisle):
    assert aisle_for(name) == aisle


def test_multibuy_unit_price_and_savings():
    d = normalize({"dealId": 1, "name": "Pasta", "currentPrice": 5, "priceText": "2/$5", "originalPrice": 3.49})
    assert d["price"] == 2.5 and d["bundleQty"] == 2 and d["savings"] == 0.99


def test_savings_from_sale_story():
    d = normalize({"dealId": 1, "name": "Cheese", "currentPrice": 4.99, "saleStory": "SAVE $2.00"})
    assert d["savings"] == 2.0 and d["regularPrice"] == 6.99


def test_no_price_dropped_and_unknown_savings():
    assert normalize({"dealId": 1, "name": "Promo", "currentPrice": None}) is None
    assert normalize({"dealId": 1, "name": "Rice", "currentPrice": 9.99})["savings"] is None


def test_dedupe_merges_queries():
    a = normalize({"dealId": 7, "name": "Chicken Thighs", "currentPrice": 8, "query": "chicken"})
    b = normalize({"dealId": 7, "name": "Chicken Thighs", "currentPrice": 8, "query": "pork"})
    assert [x["queries"] for x in dedupe([a, b])] == [["chicken", "pork"]]
