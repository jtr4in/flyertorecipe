import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from normalize import aisle_for, dedupe, fsa, multibuy_qty, normalize  # noqa: E402


def test_fsa():
    assert fsa("m5v 2t6") == "M5V"
    with pytest.raises(ValueError):
        fsa("90210")


@pytest.mark.parametrize("text,qty", [
    ("2/$5", 2), ("3 for $10", 3), ("$3.99", 1), (None, 1), ("1/$4", 1), ("2 FOR", 2),
    ("2/ OR $2.89 each", 2), ("/lb 4.37/kg", 1), ("$3.47 / 100 g", 1), ("/lb $17.61 kg", 1), ("EACH", 1),
])
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


def test_parse_targets():
    from ingest import parse_targets
    assert parse_targets("K1E 0A1:k1c, K1W,K4A") == ("K1E 0A1", ["K1E", "K1C", "K1W", "K4A"])
    assert parse_targets("M5V 2T6") == ("M5V 2T6", ["M5V"])
    with pytest.raises(ValueError):
        parse_targets("K1E 0A1:12345")


@pytest.mark.parametrize("text,unit", [
    ("/LB", "/lb"), ("prix membre /lb", "/lb"), ("per 100 g", "/100 g"),
    ("le 100 g 11,75$/lb", "/100 g"), ("$3.47 / 100 g", ""), ("EACH", ""), ("ea.", ""), ("/pkg", ""), (None, ""),
])
def test_price_unit(text, unit):
    from normalize import price_unit
    assert price_unit(text) == unit


def test_price_labels():
    lb = normalize({"dealId": 1, "name": "Ground beef", "currentPrice": 4.99, "priceText": "prix membre /lb"})
    assert lb["priceLabel"] == "$4.99/lb (member price)"
    two = normalize({"dealId": 2, "name": "Tostitos", "currentPrice": 7, "priceText": "2 FOR"})
    assert two["priceLabel"] == "2 for $7.00" and two["price"] == 3.5


@pytest.mark.parametrize("story,price,expected", [
    ("ÉCONOMISEZ 2,50$", 8.99, 2.5), ("save $10", 29.99, 10.0), ("Save $1.22-$1.72/pkg", 6.77, 1.22),
    ("1,16$ d'économie", 1.33, 1.16), ("SAVE 43%", 7.99, 6.03), ("SAVE $9", 8.99, None), ("33% OFF", 1.99, 0.98),
    ("100 Scene+ PTS when you buy 2", 2.99, None), ("15 points", 2.99, None), ("Rollback", 3.58, None),
])
def test_savings_from_story(story, price, expected):
    d = normalize({"dealId": 1, "name": "x", "currentPrice": price, "saleStory": story})
    assert d["savings"] == expected


def test_implausible_regular_price_ignored():
    # IGA smoked pork: $3.59 per 100 g vs a $17.19 regular price in another unit
    d = normalize({"dealId": 1, "name": "Smoked pork", "currentPrice": 3.59, "originalPrice": 17.19})
    assert d["regularPrice"] is None and d["savings"] is None


def test_restaurants_dropped():
    assert normalize({"dealId": 1, "name": "Crispy Chicken", "currentPrice": 5, "merchant": "Harvey's"}) is None


def test_chunk_deals_stays_under_the_size_limit():
    import json

    from ingest import chunk_deals

    deals = [{"dealId": str(i), "name": "x" * 90} for i in range(100)]
    chunks = chunk_deals(deals, limit=1000)
    assert sum(len(c) for c in chunks) == 100 and len(chunks) > 1
    assert all(len(json.dumps(c)) < 1100 for c in chunks)
