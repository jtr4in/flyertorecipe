"""Search terms sent to the actor. The actor searches by product term, not by
category, so "broad categories" are covered by a list of staples per aisle.
Each term is one search and each returned deal is billed, so keep this list tight."""

STAPLE_QUERIES = [
    # Meat & seafood
    "chicken", "ground beef", "pork", "salmon", "shrimp",
    # Dairy & eggs
    "eggs", "milk", "cheese", "yogurt", "butter",
    # Produce
    "potatoes", "onions", "carrots", "broccoli", "peppers", "tomatoes",
    "spinach", "lettuce", "apples", "bananas", "berries",
    # Pantry
    "rice", "pasta", "canned beans", "lentils", "canned tomatoes", "oats",
    "peanut butter",
    # Bakery / frozen / plant protein
    "bread", "tortillas", "frozen vegetables", "tofu",
]
