from flyer_clips import attach_clips, clip_boxes, page_item_id

PAGES = [{"left": 0, "right": 1000, "top": 0, "bottom": -2000}, {"left": 1000, "right": 2000, "top": 0, "bottom": -2000}]


def item(i, name, l, t, r, b, text=None):
    return {
        "id": i, "name": name, "left": l, "right": r, "top": -t, "bottom": -b,
        "cutout_image_url": f"https://f.wishabi.net/page_items/{i}/1/extra_large.jpg",
        "text_areas": [{"left": x[0], "top": -x[1], "right": x[2], "bottom": -x[3]} for x in (text or [])],
    }


def test_page_item_id():
    assert page_item_id("https://f.wishabi.net/page_items/436395910/1791015510/extra_large.jpg") == "436395910"
    assert page_item_id(None) is None


def test_clip_covers_price_and_same_named_neighbours_but_stays_on_page():
    items = [
        item(1, "BREAD OR BAGELS", 100, 100, 200, 300, text=[(210, 250, 400, 350)]),
        item(2, "BREAD OR BAGELS", 220, 100, 320, 300),
        item(3, "BREAD OR BAGELS", 1500, 100, 1600, 300),  # same name, other side of the flyer
        item(4, "PEARS", 900, 100, 1100, 200),  # straddles the page edge
    ]
    boxes = clip_boxes(items, PAGES)
    l, t, r, b = boxes["1"]
    assert l < 100 and t < 100 and r > 400 and b > 350
    assert r < 1000  # did not reach item 3
    assert boxes["4"][2] <= 1000


def test_attach_clips():
    deals = [{"imageUrl": "https://f.wishabi.net/page_items/7/1/extra_large.jpg"}, {"imageUrl": None}]
    assert attach_clips(deals, {"7": {"flyerId": 9, "clip": {"box": [0, 0, 1, 1]}}}) == 1
    assert deals[0]["flyerId"] == 9 and "clip" not in deals[1]


def test_flyer_rows_read_like_actor_rows():
    from flyer_clips import flyer_rows
    from normalize import normalize

    flyer = {"id": 5, "merchant": "No Frills", "valid_from": "2026-10-09", "valid_to": "2026-10-15"}
    items = [
        {"id": 1, "name": "Chicken Drumsticks", "price": "1.99", "pre_price_text": "", "post_price_text": "/lb", "sale_story": "SAVE $1.50"},
        {"id": 2, "name": "Cheerios Cereal", "brand": "General Mills", "price": "$7.00", "pre_price_text": "2/", "discount": 30},
        {"id": 3, "name": "Banner: Weekly Specials", "price": ""},
    ]
    rows = flyer_rows([(flyer, {"items": items})])
    assert [r["dealId"] for r in rows] == ["f1", "f2"]
    a, b = (normalize(r) for r in rows)
    assert a["priceLabel"] == "$1.99/lb" and a["savings"] == 1.5 and a["validTo"] == "2026-10-15"
    assert b["name"] == "General Mills Cheerios Cereal" and b["bundleQty"] == 2 and b["price"] == 3.5
    assert b["saleStory"] == "SAVE 30%" and b["regularPrice"] == 5.0


def test_price_text_cleanup():
    from flyer_clips import _price

    assert _price("4,99") == "4.99" and _price("2.99/lb") == "2.99" and _price("") is None
