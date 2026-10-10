"""Search terms sent to the actor, with how many flyer items to keep for each.

The actor searches by product term, and its per-term limit is shared by every store in the
area. Broad terms ("chicken", "cheese") have dozens of flyer items across 25+ stores, so they
get a big limit; narrow ones ("zucchini", "naan") rarely have more than a handful, so a small
limit costs nothing and still finds them. Every recipe ingredient has a term that finds it.
Each returned item is billed, so the total stays near SEARCH_BUDGET items a run."""

QUERY_LIMITS = {
    60: [
        # Everyday staples where every store has several kinds on sale.
        "chicken", "ground beef", "pork", "cheese", "milk", "yogurt", "bread",
        "frozen meals", "cereal", "chips", "cookies", "coffee", "juice",
    ],
    30: [
        "salmon", "shrimp", "sausage", "bacon", "eggs", "butter", "deli meat",
        "potatoes", "peppers", "tomatoes", "apples", "berries",
        "pasta", "rice", "frozen vegetables", "ice cream", "chocolate", "frozen pizza",
        "toilet paper", "paper towels", "laundry detergent", "diapers", "pet food",
    ],
    15: [
        # Produce and pantry items with only a few flyer items each.
        "onions", "carrots", "broccoli", "spinach", "lettuce", "bananas", "zucchini",
        "mushrooms", "cauliflower", "green beans", "asparagus", "brussels sprouts", "squash",
        "salad", "kale", "cucumber", "celery", "grapes", "oranges", "pears",
        "ground turkey", "fish fillets", "canned tuna", "tofu", "canned beans", "chickpeas",
        "lentils", "canned tomatoes", "oats", "granola", "peanut butter", "hummus",
        "crackers", "nuts", "quinoa", "egg noodles", "tortillas", "pitas", "naan",
        "bagels", "english muffins", "buns", "frozen fruit",
        "mac and cheese", "pasta sauce", "hot dogs", "soup",
        "dish soap", "shampoo", "toothpaste",
    ],
}

STAPLE_QUERIES = [q for terms in QUERY_LIMITS.values() for q in terms]
SEARCH_BUDGET = sum(limit * len(terms) for limit, terms in QUERY_LIMITS.items())
