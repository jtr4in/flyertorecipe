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
