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
