from flyermeal_recipes import clean


def test_clean_reads_ingredients_and_drops_step_markers():
    meal = {
        "idMeal": "52772", "strMeal": " Teriyaki Chicken Casserole ", "strCategory": "Chicken", "strArea": "Japanese",
        "strMealThumb": "https://www.themealdb.com/images/media/meals/x.jpg", "strTags": "Meat,Casserole",
        "strInstructions": "STEP 1\r\nHeat the oven.\r\n\r\n2.\r\nMix the sauce.",
        "strIngredient1": "soy sauce", "strMeasure1": "3/4 cup", "strIngredient2": " ", "strMeasure2": " ",
        "strIngredient3": None, "strYoutube": "", "strSource": None,
    }
    r = clean(meal)
    assert r["id"] == "mealdb:52772"
    assert r["name"] == "Teriyaki Chicken Casserole"
    assert r["ingredients"] == [{"name": "soy sauce", "measure": "3/4 cup"}]
    assert r["steps"] == ["Heat the oven.", "Mix the sauce."]
    assert r["tags"] == ["Meat", "Casserole"]


def test_build_keeps_named_dishes_and_classics_first(tmp_path, monkeypatch):
    import flyermeal_recipes as fm
    monkeypatch.setattr(fm, "OUT", tmp_path / "recipes.json")
    monkeypatch.setattr(fm, "PHOTOS", tmp_path / "photos.json")
    common = tmp_path / "common.json"
    common.write_text('{"_about": "x", "Pasta": ["Lasagne"]}')
    classics = tmp_path / "classics.json"
    classics.write_text(
        '{"recipes": [{"id": "sm", "name": "Spaghetti and Meatballs", "group": "Pasta", "ingredients": [{"name": "crushed tomatoes", "measure": "1 can"}],'
        ' "steps": ["Cook."], "swaps": [{"label": "Use jarred pasta sauce", "sauce": "pasta sauce", "measure": "1 jar", "replaces": ["crushed tomatoes"], "note": "n"}]}]}'
    )
    monkeypatch.setattr(fm, "COMMON", common)
    monkeypatch.setattr(fm, "CLASSICS", classics)
    monkeypatch.setattr(fm, "SWAPS", tmp_path / "none.json")
    monkeypatch.setattr(fm, "SWAP_STEPS", tmp_path / "none.json")
    catalogue = [
        {"id": "mealdb:1", "name": "Lasagne", "area": "Italian", "image": "https://x/l.jpg", "youtube": "", "source": "", "ingredients": [], "steps": []},
        {"id": "mealdb:2", "name": "Algerian Bouzgene Berber Bread", "area": "", "image": "", "youtube": "", "source": "", "ingredients": [], "steps": []},
    ]
    data = fm.build(catalogue, offline=True)
    assert [r["name"] for r in data["recipes"]] == ["Spaghetti and Meatballs", "Lasagne"]
    assert data["recipes"][1]["thumb"] == "https://x/l.jpg/small"
    assert data["recipes"][0]["swaps"][0]["sauce"] == "pasta sauce"


def test_real_library_files_are_consistent():
    import flyermeal_recipes as fm
    catalogue = fm.read(fm.CACHE, {"recipes": []})["recipes"]
    names = {r["name"] for r in catalogue}
    common = {k: v for k, v in fm.read(fm.COMMON, {}).items() if not k.startswith("_")}
    assert set(common) <= set(fm.GROUPS)
    assert all(n in names for v in common.values() for n in v)
    for c in fm.read(fm.CLASSICS, {})["recipes"]:
        assert c["group"] in fm.GROUPS
        have = {i["name"] for i in c["ingredients"]}
        for s in c.get("swaps", []):
            assert set(s["replaces"]) <= have, c["name"]
