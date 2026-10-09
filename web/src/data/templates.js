// Meal templates. Each slot names catalog groups to draw from; the planner fills it with
// whatever is on sale, so "Sheet-pan {protein} with {veg} & {starch}" becomes
// "Sheet-pan chicken thighs with broccoli & potatoes" in a week where those are in the flyer.
//
// slot: { key, from: [catalog groups], qty?: multiplier on the item's per-serving qty,
//         main?: true for the protein that defines the dish, optional?: true }
// pantry: staples we assume are on hand (never priced).
// tags: quick | kid-approved | big-batch | high-protein (auto when a main slot is meat/fish/eggs/tofu)

const t = (meal, id, emoji, minutes, slots, name, opts = {}) => ({ meal, id, emoji, minutes, slots, name, pantry: [], tags: [], ...opts })
const PROTEIN = ['poultry', 'pork', 'fish', 'plantProtein']

export const TEMPLATES = [
  // ---------------- Dinner ----------------
  t('dinner', 'sheet-pan', '🍗', 40,
    [{ key: 'protein', from: ['poultry', 'pork', 'plantProtein'], main: true }, { key: 'veg', from: ['cookingVeg'] }, { key: 'starch', from: ['starch'], only: ['potatoes', 'sweet potatoes'] }],
    (f) => `Sheet-pan ${f.protein} with ${f.veg} & ${f.starch}`,
    { pantry: ['olive oil', 'garlic powder', 'dried herbs'], tags: ['kid-approved'] }),
  t('dinner', 'stir-fry', '🥢', 25,
    [{ key: 'protein', from: ['poultry', 'pork', 'fish', 'plantProtein'], main: true, exclude: ['whole chicken', 'chickpeas', 'black beans', 'lentils', 'sausages'] }, { key: 'veg', from: ['cookingVeg'] }, { key: 'veg2', from: ['cookingVeg'], qty: 0.5, optional: true }, { key: 'starch', from: ['starch'], only: ['rice', 'egg noodles'] }],
    (f) => `${cap(f.protein)} & ${f.veg} stir-fry${f.veg2 ? ` with ${f.veg2}` : ''} over ${f.starch}`,
    { pantry: ['soy sauce', 'garlic', 'cooking oil'], tags: ['quick'] }),
  t('dinner', 'tacos', '🌮', 25,
    [{ key: 'protein', from: ['ground', 'plantProtein', 'poultry'], main: true, exclude: ['whole chicken', 'firm tofu', 'chickpeas'] }, { key: 'wrap', from: ['wraps'], only: ['tortillas'] }, { key: 'greens', from: ['greens'], only: ['lettuce'] }, { key: 'topping', from: ['saladVeg'], only: ['tomatoes', 'bell peppers'] }, { key: 'cheese', from: ['cheese'], only: ['cheddar'], optional: true }],
    (f) => `${cap(f.protein)} tacos with ${f.topping}`,
    { pantry: ['taco spices', 'salsa'], tags: ['quick', 'kid-approved'] }),
  t('dinner', 'pasta', '🍝', 30,
    [{ key: 'protein', from: ['ground', 'pork', 'plantProtein'], main: true, only: ['ground beef', 'ground turkey', 'ground pork', 'ground chicken', 'sausages', 'lentils', 'chickpeas'] }, { key: 'sauce', from: ['cannedTomato'] }, { key: 'veg', from: ['cookingVeg', 'greens'], only: ['zucchini', 'mushrooms', 'spinach', 'bell peppers', 'kale'] }, { key: 'starch', from: ['starch'], only: ['pasta'] }],
    (f) => `${cap(f.protein)} pasta with ${f.veg}`,
    { pantry: ['garlic', 'italian seasoning', 'parmesan'], tags: ['kid-approved', 'big-batch'] }),
  t('dinner', 'fish-plate', '🐟', 25,
    [{ key: 'protein', from: ['fish'], main: true, exclude: ['shrimp'] }, { key: 'veg', from: ['cookingVeg'] }, { key: 'starch', from: ['starch'], only: ['rice', 'potatoes', 'quinoa', 'sweet potatoes'] }],
    (f) => `Lemon-garlic ${f.protein} with ${f.veg} & ${f.starch}`,
    { pantry: ['lemon juice', 'garlic', 'butter or oil'], tags: ['quick'] }),
  t('dinner', 'fajitas', '🫑', 25,
    [{ key: 'protein', from: ['poultry', 'pork', 'fish', 'plantProtein'], main: true, only: ['chicken breasts', 'chicken thighs', 'shrimp', 'pork tenderloin', 'black beans', 'firm tofu'] }, { key: 'veg', from: ['cookingVeg'], only: ['bell peppers', 'zucchini', 'mushrooms'] }, { key: 'wrap', from: ['wraps'], only: ['tortillas'] }, { key: 'cheese', from: ['cheese'], only: ['cheddar'], optional: true }],
    (f) => `${cap(f.protein)} fajitas with ${f.veg}`,
    { pantry: ['fajita spices', 'onion', 'salsa'], tags: ['quick', 'kid-approved'] }),
  t('dinner', 'curry', '🍛', 35,
    [{ key: 'protein', from: ['plantProtein', 'poultry'], main: true, only: ['chickpeas', 'lentils', 'firm tofu', 'chicken thighs', 'chicken breasts'] }, { key: 'veg', from: ['cookingVeg', 'greens'], only: ['cauliflower', 'spinach', 'squash', 'bell peppers', 'green beans', 'sweet potatoes', 'frozen mixed vegetables'] }, { key: 'sauce', from: ['cannedTomato'] }, { key: 'starch', from: ['starch', 'wraps'], only: ['rice', 'naan'] }],
    (f) => `${cap(f.protein)} & ${f.veg} curry with ${f.starch}`,
    { pantry: ['curry paste or powder', 'coconut milk', 'onion', 'garlic'], tags: ['big-batch'] }),
  t('dinner', 'fried-rice', '🍳', 20,
    [{ key: 'protein', from: ['poultry', 'pork', 'fish', 'plantProtein'], main: true, only: ['chicken breasts', 'chicken thighs', 'shrimp', 'pork chops', 'firm tofu', 'sausages'] }, { key: 'veg', from: ['cookingVeg'], only: ['frozen mixed vegetables', 'bell peppers', 'carrots', 'broccoli', 'green beans'] }, { key: 'eggs', from: ['eggs'], qty: 0.5 }, { key: 'starch', from: ['starch'], only: ['rice'] }],
    (f) => `${cap(f.protein)} fried rice with ${f.veg}`,
    { pantry: ['soy sauce', 'green onion', 'cooking oil'], tags: ['quick', 'kid-approved'] }),
  t('dinner', 'skillet', '🍳', 30,
    [{ key: 'protein', from: ['pork', 'ground'], main: true, only: ['sausages', 'ground beef', 'ground turkey', 'ground pork', 'ground chicken'] }, { key: 'veg', from: ['cookingVeg'], only: ['bell peppers', 'zucchini', 'mushrooms', 'green beans', 'brussels sprouts'] }, { key: 'starch', from: ['starch'], only: ['potatoes', 'sweet potatoes', 'rice'] }],
    (f) => `${cap(f.protein)}, ${f.veg} & ${f.starch} skillet`,
    { pantry: ['onion', 'paprika', 'cooking oil'], tags: ['kid-approved'] }),
  t('dinner', 'chili', '🌶️', 45,
    [{ key: 'protein', from: ['ground', 'plantProtein'], main: true, only: ['ground beef', 'ground turkey', 'ground chicken', 'lentils', 'black beans'] }, { key: 'beans', from: ['plantProtein'], only: ['black beans', 'chickpeas'] }, { key: 'sauce', from: ['cannedTomato'], qty: 2 }, { key: 'veg', from: ['cookingVeg'], only: ['bell peppers', 'zucchini', 'carrots', 'squash'] }],
    (f) => `${cap(f.protein)} chili with ${f.veg}`,
    { pantry: ['chili powder', 'cumin', 'onion'], tags: ['big-batch'] }),
  t('dinner', 'burgers', '🍔', 25,
    [{ key: 'protein', from: ['ground'], main: true }, { key: 'bun', from: ['buns'] }, { key: 'greens', from: ['greens'], only: ['lettuce'] }, { key: 'topping', from: ['saladVeg'], only: ['tomatoes', 'cucumber'] }, { key: 'side', from: ['starch', 'cookingVeg'], only: ['sweet potatoes', 'potatoes', 'carrots', 'green beans'] }],
    (f) => `${cap(f.protein.replace('ground ', ''))} burgers with ${f.side}`,
    { pantry: ['ketchup & mustard', 'onion'], tags: ['kid-approved'] }),
  t('dinner', 'frittata', '🥚', 30,
    [{ key: 'protein', from: ['eggs'], main: true, qty: 1.5 }, { key: 'veg', from: ['cookingVeg', 'greens'], only: ['spinach', 'mushrooms', 'bell peppers', 'zucchini', 'broccoli', 'kale', 'asparagus'] }, { key: 'cheese', from: ['cheese'] }, { key: 'side', from: ['greens', 'bread'], only: ['salad greens', 'lettuce', 'bread'] }],
    (f) => `${cap(f.veg)} & ${f.cheese} frittata with ${f.side}`,
    { pantry: ['onion', 'cooking oil'], tags: ['quick'] }),
  t('dinner', 'roast', '🍗', 75,
    [{ key: 'protein', from: ['poultry', 'pork'], main: true, only: ['whole chicken', 'pork tenderloin'] }, { key: 'veg', from: ['cookingVeg'], only: ['carrots', 'brussels sprouts', 'squash', 'green beans', 'broccoli'] }, { key: 'starch', from: ['starch'], only: ['potatoes', 'sweet potatoes'] }],
    (f) => `Roast ${f.protein} with ${f.veg} & ${f.starch}`,
    { pantry: ['butter or oil', 'herbs', 'garlic'], tags: ['big-batch'] }),

  // ---------------- Breakfast ----------------
  t('breakfast', 'overnight-oats', '🥣', 5,
    [{ key: 'oats', from: ['oats'], only: ['oats'] }, { key: 'milk', from: ['milk', 'yogurt'] }, { key: 'fruit', from: ['fruit', 'frozenFruit'], only: ['strawberries', 'blueberries', 'bananas', 'apples', 'frozen fruit', 'pears'] }],
    (f) => `Overnight oats with ${f.fruit}`, { pantry: ['maple syrup', 'cinnamon'], tags: ['quick', 'kid-approved'] }),
  t('breakfast', 'parfait', '🍓', 5,
    [{ key: 'yogurt', from: ['yogurt'], main: true }, { key: 'fruit', from: ['fruit', 'frozenFruit'], only: ['strawberries', 'blueberries', 'bananas', 'frozen fruit', 'grapes'] }, { key: 'crunch', from: ['oats', 'nuts'] }],
    (f) => `Yogurt parfait with ${f.fruit} & ${f.crunch}`, { tags: ['quick', 'kid-approved'] }),
  t('breakfast', 'eggs-toast', '🍳', 10,
    [{ key: 'eggs', from: ['eggs'], main: true }, { key: 'veg', from: ['greens', 'cookingVeg', 'saladVeg'], only: ['spinach', 'tomatoes', 'mushrooms', 'bell peppers'] }, { key: 'bread', from: ['bread'] }],
    (f) => `Scrambled eggs with ${f.veg} on ${f.bread}`, { pantry: ['butter or oil'], tags: ['quick'] }),
  t('breakfast', 'breakfast-wrap', '🌯', 15,
    [{ key: 'eggs', from: ['eggs'], main: true }, { key: 'wrap', from: ['wraps'], only: ['tortillas'] }, { key: 'cheese', from: ['cheese'], only: ['cheddar'] }, { key: 'veg', from: ['cookingVeg', 'greens'], only: ['bell peppers', 'spinach', 'mushrooms'] }],
    (f) => `Egg, ${f.veg} & cheese breakfast wraps`, { pantry: ['salsa'], tags: ['kid-approved'] }),
  t('breakfast', 'smoothie', '🥤', 5,
    [{ key: 'fruit', from: ['fruit', 'frozenFruit'], only: ['bananas', 'strawberries', 'blueberries', 'frozen fruit'] }, { key: 'fruit2', from: ['fruit', 'frozenFruit'], only: ['bananas', 'frozen fruit', 'strawberries', 'blueberries'], qty: 0.5 }, { key: 'yogurt', from: ['yogurt', 'milk'] }, { key: 'greens', from: ['greens'], only: ['spinach'], optional: true, qty: 0.5 }],
    (f) => `${cap(f.fruit)}${f.fruit2 ? ` & ${f.fruit2}` : ''} smoothie`, { tags: ['quick', 'kid-approved'] }),
  t('breakfast', 'pb-toast', '🥜', 5,
    [{ key: 'bread', from: ['bread'] }, { key: 'spread', from: ['spread'] }, { key: 'fruit', from: ['fruit'], only: ['bananas', 'apples', 'strawberries'] }],
    (f) => `Peanut butter ${f.bread === 'bread' ? 'toast' : f.bread} with ${f.fruit}`, { tags: ['quick', 'kid-approved'] }),

  // ---------------- Lunch ----------------
  t('lunch', 'wrap', '🌯', 10,
    [{ key: 'protein', from: ['lunchProtein', 'plantProtein'], main: true, only: ['deli turkey or ham', 'rotisserie chicken', 'canned tuna', 'chickpeas'] }, { key: 'wrap', from: ['wraps'], only: ['tortillas', 'pitas'] }, { key: 'greens', from: ['greens'] }, { key: 'veg', from: ['saladVeg'] }],
    (f) => `${cap(f.protein)} wraps with ${f.veg}`, { pantry: ['mayo or hummus'], tags: ['quick', 'kid-approved'] }),
  t('lunch', 'big-salad', '🥗', 10,
    [{ key: 'greens', from: ['greens'], qty: 1.5 }, { key: 'veg', from: ['saladVeg'] }, { key: 'veg2', from: ['saladVeg'], optional: true }, { key: 'protein', from: ['lunchProtein', 'plantProtein', 'eggs'], main: true, only: ['rotisserie chicken', 'canned tuna', 'chickpeas', 'eggs', 'black beans'] }, { key: 'cheese', from: ['cheese'], only: ['feta', 'cheddar'], optional: true }],
    (f) => `Big ${f.protein} salad with ${f.veg}${f.veg2 ? ` & ${f.veg2}` : ''}`, { pantry: ['salad dressing'], tags: ['quick'] }),
  t('lunch', 'grain-bowl', '🍚', 20,
    [{ key: 'starch', from: ['starch'], only: ['rice', 'quinoa'] }, { key: 'protein', from: ['plantProtein', 'lunchProtein', 'eggs'], main: true, only: ['chickpeas', 'black beans', 'rotisserie chicken', 'eggs', 'firm tofu'] }, { key: 'veg', from: ['saladVeg', 'greens', 'cookingVeg'], only: ['cucumber', 'tomatoes', 'spinach', 'bell peppers', 'carrots', 'broccoli'] }, { key: 'veg2', from: ['saladVeg', 'greens'], optional: true }],
    (f) => `${cap(f.protein)} grain bowl with ${f.veg}${f.veg2 ? ` & ${f.veg2}` : ''}`, { pantry: ['dressing or soy sauce'], tags: ['big-batch'] }),
  t('lunch', 'quesadilla', '🧀', 15,
    [{ key: 'wrap', from: ['wraps'], only: ['tortillas'] }, { key: 'cheese', from: ['cheese'], only: ['cheddar', 'mozzarella'], main: true }, { key: 'filling', from: ['plantProtein', 'lunchProtein'], only: ['black beans', 'rotisserie chicken'] }, { key: 'veg', from: ['cookingVeg', 'greens'], only: ['bell peppers', 'spinach', 'mushrooms', 'zucchini'] }],
    (f) => `${cap(f.filling)} & ${f.veg} quesadillas`, { pantry: ['salsa'], tags: ['quick', 'kid-approved'] }),
  t('lunch', 'pita-plate', '🫓', 10,
    [{ key: 'wrap', from: ['wraps'], only: ['pitas', 'naan'] }, { key: 'dip', from: ['dip'] }, { key: 'veg', from: ['saladVeg'] }, { key: 'veg2', from: ['saladVeg'], optional: true }, { key: 'cheese', from: ['cheese'], only: ['feta'], optional: true }],
    (f) => `Pita & hummus plate with ${f.veg}${f.veg2 ? ` & ${f.veg2}` : ''}`, { tags: ['quick'] }),
  t('lunch', 'sandwich', '🥪', 10,
    [{ key: 'bread', from: ['bread', 'buns'], only: ['bread', 'bagels', 'buns'] }, { key: 'protein', from: ['lunchProtein', 'eggs'], main: true, only: ['deli turkey or ham', 'canned tuna', 'eggs', 'rotisserie chicken'] }, { key: 'greens', from: ['greens'], only: ['lettuce', 'spinach'] }, { key: 'veg', from: ['saladVeg'], only: ['tomatoes', 'cucumber'] }, { key: 'side', from: ['fruit'], optional: true }],
    (f) => `${cap(f.protein)} sandwiches${f.side ? ` & ${f.side}` : ''}`, { pantry: ['mayo or mustard'], tags: ['quick', 'kid-approved'] }),

  // ---------------- Snacks ----------------
  t('snack', 'fruit', '🍎', 1, [{ key: 'fruit', from: ['fruit'] }], (f) => cap(f.fruit), { tags: ['quick', 'kid-approved'] }),
  t('snack', 'yogurt-fruit', '🍨', 2, [{ key: 'yogurt', from: ['yogurt'] }, { key: 'fruit', from: ['fruit', 'frozenFruit'], only: ['strawberries', 'blueberries', 'grapes', 'bananas', 'frozen fruit'] }], (f) => `Yogurt & ${f.fruit}`, { tags: ['quick', 'kid-approved'] }),
  t('snack', 'veg-dip', '🥕', 5, [{ key: 'veg', from: ['saladVeg'], only: ['carrots', 'cucumber', 'bell peppers', 'celery'] }, { key: 'dip', from: ['dip'] }], (f) => `${cap(f.veg)} & hummus`, { tags: ['quick'] }),
  t('snack', 'cheese-crackers', '🧀', 2, [{ key: 'cheese', from: ['cheese'], only: ['cheddar'] }, { key: 'crackers', from: ['crackers'] }, { key: 'fruit', from: ['fruit'], only: ['grapes', 'apples', 'pears'], optional: true }], (f) => `Cheese & crackers${f.fruit ? ` with ${f.fruit}` : ''}`, { tags: ['quick', 'kid-approved'] }),
  t('snack', 'apple-pb', '🍏', 2, [{ key: 'fruit', from: ['fruit'], only: ['apples', 'bananas', 'pears'] }, { key: 'spread', from: ['spread'] }], (f) => `${cap(f.fruit)} with peanut butter`, { tags: ['quick', 'kid-approved'] }),
  t('snack', 'nuts', '🥜', 1, [{ key: 'nuts', from: ['nuts'] }, { key: 'fruit', from: ['fruit'], only: ['oranges', 'apples', 'grapes'], optional: true }], (f) => `Nuts${f.fruit ? ` & ${f.fruit}` : ''}`, { tags: ['quick'] }),
]

export const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '☀️' },
  { id: 'lunch', label: 'Lunch', emoji: '🥪' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { id: 'snack', label: 'Snacks', emoji: '🍎' },
]

export const PROTEIN_GROUPS = PROTEIN

export function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
