// Pantry items recipes assume you have. Most kitchens keep the staples; the rest get flagged on
// the grocery list as "check you have these", grouped by where they are in the store.

// Lowercase names most households already have.
const STAPLES = new Set([
  'salt', 'pepper', 'salt & pepper', 'cooking oil', 'olive oil', 'butter', 'butter or oil', 'garlic', 'onion',
  'flour', 'sugar', 'white sugar', 'brown sugar', 'ketchup', 'mustard', 'ketchup & mustard', 'mayonnaise',
  'mayo or mustard', 'mayo or hummus', 'soy sauce', 'dressing or soy sauce', 'salad dressing', 'honey',
  'maple syrup', 'cinnamon', 'baking powder', 'baking soda', 'vanilla', 'vanilla extract', 'garlic powder',
  'paprika', 'chili powder', 'cumin', 'chili flakes', 'italian seasoning', 'dried herbs', 'herbs', 'oregano',
  'thyme', 'lemon juice', 'hot sauce', 'white vinegar', 'cornstarch', 'ice',
])

// First match wins; anything else is Pantry.
const AISLE_WORDS = [
  ['Produce', ['garlic', 'onion', 'ginger', 'lemon', 'lime', 'cilantro', 'parsley', 'dill', 'herbs']],
  ['Dairy & Eggs', ['butter', 'parmesan', 'sour cream', 'cream', 'ricotta', 'cottage']],
  ['Frozen', ['ice', 'pie crust']],
  ['Spices & Baking', [
    'salt', 'pepper', 'cinnamon', 'cumin', 'paprika', 'chili', 'seasoning', 'spices', 'sage', 'thyme', 'oregano',
    'nutmeg', 'cloves', 'allspice', 'cardamom', 'turmeric', 'coriander', 'garam masala', 'cayenne', 'bay leaf',
    'dry mustard', 'curry', 'flour', 'sugar', 'baking', 'vanilla', 'cocoa', 'chocolate chips', 'sprinkles',
    'cornstarch', 'molasses', 'breadcrumbs', 'sesame seeds', 'marshmallows', 'raisins',
  ]],
]
const word = (w) => new RegExp(`\\b${w}`, 'i')

export const PANTRY_AISLES = ['Produce', 'Dairy & Eggs', 'Frozen', 'Pantry', 'Spices & Baking']

export function pantryInfo(name) {
  const key = name.toLowerCase().trim()
  // "ground ginger" is a spice even though "ginger" is produce.
  const aisle = /^ground |powder|dried /.test(key)
    ? 'Spices & Baking'
    : AISLE_WORDS.find(([, words]) => words.some((w) => word(w).test(key)))?.[0] || 'Pantry'
  return { aisle, staple: STAPLES.has(key) }
}
