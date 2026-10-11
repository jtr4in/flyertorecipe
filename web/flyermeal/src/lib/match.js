// Recipe ingredients vs. the shopping list. TheMealDB writes British names ("minced beef",
// "courgette", "plain flour"), so both sides are folded to one plain name before comparing.

// British → North American, and the many ways recipes name the same grocery. Longest first.
const SAME = [
  ['minced beef', 'ground beef'], ['beef mince', 'ground beef'], ['lean minced beef', 'ground beef'],
  ['minced pork', 'ground pork'], ['pork mince', 'ground pork'], ['minced lamb', 'ground lamb'], ['lamb mince', 'ground lamb'],
  ['minced turkey', 'ground turkey'], ['turkey mince', 'ground turkey'], ['minced chicken', 'ground chicken'],
  ['aubergine', 'eggplant'], ['courgette', 'zucchini'], ['spring onion', 'green onion'], ['scallion', 'green onion'],
  ['double cream', 'cream'], ['single cream', 'cream'], ['heavy cream', 'cream'], ['whipping cream', 'cream'], ['thickened cream', 'cream'],
  ['caster sugar', 'sugar'], ['granulated sugar', 'sugar'], ['white sugar', 'sugar'], ['icing sugar', 'powdered sugar'],
  ['plain flour', 'flour'], ['all purpose flour', 'flour'], ['all-purpose flour', 'flour'], ['self-raising flour', 'flour'], ['self raising flour', 'flour'],
  ['king prawn', 'shrimp'], ['tiger prawn', 'shrimp'], ['prawn', 'shrimp'], ['rocket', 'arugula'], ['chilli', 'chili'], ['chillies', 'chili'],
  ['mangetout', 'snow pea'], ['beetroot', 'beet'], ['swede', 'rutabaga'], ['streaky bacon', 'bacon'], ['bacon rasher', 'bacon'],
  ['cheddar cheese', 'cheddar'], ['parmesan cheese', 'parmesan'], ['parmigiano-reggiano', 'parmesan'], ['parmigiano reggiano', 'parmesan'],
  ['mozzarella cheese', 'mozzarella'], ['feta cheese', 'feta'],
  ['red pepper', 'bell pepper'], ['green pepper', 'bell pepper'], ['yellow pepper', 'bell pepper'], ['orange pepper', 'bell pepper'],
  ['chopped tomatoes', 'canned tomato'], ['tinned tomatoes', 'canned tomato'], ['plum tomatoes', 'canned tomato'], ['passata', 'tomato sauce'],
  ['tomato puree', 'tomato paste'], ['garlic clove', 'garlic'], ['clove of garlic', 'garlic'], ['cloves garlic', 'garlic'],
  ['spaghetti', 'pasta spaghetti'], ['penne rigate', 'pasta penne'], ['penne', 'pasta penne'], ['rigatoni', 'pasta rigatoni'], ['fusilli', 'pasta fusilli'],
  ['linguine', 'pasta linguine'], ['tagliatelle', 'pasta tagliatelle'], ['farfalle', 'pasta farfalle'], ['macaroni', 'pasta macaroni'], ['lasagne sheets', 'pasta lasagna'],
  ['basmati rice', 'rice'], ['jasmine rice', 'rice'], ['long grain rice', 'rice'], ['arborio rice', 'rice arborio'],
  ['greek yogurt', 'yogurt'], ['natural yogurt', 'yogurt'], ['plain yogurt', 'yogurt'], ['yoghurt', 'yogurt'],
  ['vegetable oil', 'oil'], ['sunflower oil', 'oil'], ['canola oil', 'oil'], ['rapeseed oil', 'oil'], ['olive oil', 'oil'], ['groundnut oil', 'oil'], ['peanut oil', 'oil'], ['dark soy sauce', 'soy sauce'], ['light soy sauce', 'soy sauce'],
  ['chicken stock', 'stock'], ['beef stock', 'stock'], ['vegetable stock', 'stock'], ['chicken broth', 'stock'], ['beef broth', 'stock'], ['stock cube', 'stock'],
  ['black pepper', 'pepper'], ['white pepper', 'pepper'], ['peppercorns', 'pepper'], ['sea salt', 'salt'], ['kosher salt', 'salt'],
  ['coriander leaves', 'cilantro'], ['fresh coriander', 'cilantro'],
]

// Words that describe how it's cut or sold, not what it is.
const NOISE = new Set(
  'fresh freshly chopped diced sliced large small medium boneless skinless free range organic extra virgin unsalted salted dried frozen canned tinned tin can of whole raw cooked peeled grated shredded crushed finely roughly thinly to taste handful pinch ripe lean'.split(' '),
)

const fold = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 -]+/g, ' ')
const single = (w) =>
  w.length < 4 || /(ss|us|is)$/.test(w) ? w : w.endsWith('ies') ? w.slice(0, -3) + 'y' : /(oes|ches|shes|xes)$/.test(w) ? w.slice(0, -2) : w.endsWith('s') ? w.slice(0, -1) : w

/** "2 Free-range Minced Beef " → "ground beef"; "Courgettes" → "zucchini". */
export function norm(name) {
  let t = ` ${fold(name).replace(/\s+/g, ' ').trim()} `
  for (const [from, to] of SAME) t = t.replace(new RegExp(` ${from}s? `, 'g'), ` ${to} `)
  // "Coriander" alone is the herb; ground coriander and seeds are the spice.
  if (/ coriander /.test(t) && !/ (ground|seed)/.test(t)) t = t.replace(' coriander ', ' cilantro ')
  if (/ garlic /.test(t)) t = t.replace(/ cloves? /, ' ')
  const keepGround = /ground (beef|pork|lamb|turkey|chicken)/.test(t)
  const words = t
    .trim()
    .split(/[\s-]+/)
    .filter((w) => w && !/^\d+$/.test(w) && !NOISE.has(w) && (keepGround || w !== 'ground'))
    .map(single)
  return words.join(' ')
}

// An ingredient made from the thing, not the thing: "chicken stock" isn't the chicken on your list,
// and "rice noodles" aren't the rice.
const MADE_FROM = new Set(['noodle', 'vermicelli', 'flour', 'wine', 'milk', 'cake', 'bread', 'crumb', 'cracker', 'wrapper', 'paper', 'starch', 'syrup', 'stock', 'broth', 'cube', 'powder', 'sauce', 'paste', 'seasoning', 'extract', 'essence', 'gravy', 'soup', 'jelly', 'jam', 'juice', 'zest', 'leaves', 'leaf', 'seed', 'oil', 'flake', 'vinegar'])

/** Does the shopping-list entry cover this recipe ingredient? Both already folded with norm(). */
export function covers(item, ingredient) {
  if (!item || !ingredient) return false
  if (item === ingredient) return true
  const a = item.split(' ')
  const b = ingredient.split(' ')
  // "chicken" covers "chicken thigh", but not "chicken stock" (unless the list says stock).
  if (a.every((w) => b.includes(w))) return !b.some((w) => MADE_FROM.has(w) && !a.includes(w))
  // "chicken breast" on the list covers a recipe that just says "chicken".
  return b.every((w) => a.includes(w)) && !a.some((w) => MADE_FROM.has(w) && !b.includes(w))
}

// What most kitchens already have. Recipes count these as covered, so a recipe isn't "missing 9"
// because it uses salt, oil and garlic.
export const PANTRY = [
  'salt', 'pepper', 'oil', 'butter', 'sugar', 'brown sugar', 'flour', 'water', 'garlic', 'onion', 'red onion', 'white onion', 'yellow onion',
  'baking powder', 'baking soda', 'bicarbonate of soda', 'vinegar', 'white wine vinegar', 'red wine vinegar', 'soy sauce', 'ketchup', 'mustard',
  'dijon mustard', 'honey', 'oregano', 'thyme', 'basil', 'paprika', 'cumin', 'chili powder', 'cinnamon', 'vanilla extract',
  'stock', 'cornstarch', 'cornflour', 'tomato paste', 'bay leaf', 'rosemary', 'parsley', 'nutmeg', 'mixed herb', 'italian seasoning', 'garlic powder', 'onion powder',
].map(norm)

const pantrySet = new Set(PANTRY)
// Any everyday oil or vinegar counts too ("white vinegar", "peanut oil"), but not the specialty ones.
export const inPantry = (key, pantry = pantrySet) => pantry.has(key) || (/(^| )(oil|vinegar)$/.test(key) && !/sesame|truffle|chili|coconut|malt/.test(key))

/**
 * How a recipe sits against the list: each ingredient is 'list' (you're buying it), 'pantry'
 * (you likely have it) or 'need'. `list` and `pantry` hold norm()-ed names.
 */
export function scoreRecipe(recipe, list, pantry = pantrySet) {
  const lines = recipe.ingredients.map((ing) => {
    const key = ing.key || norm(ing.name)
    const from = list.find((item) => covers(item, key))
    return { ...ing, key, status: from ? 'list' : inPantry(key, pantry) ? 'pantry' : 'need', from }
  })
  const used = new Set(lines.filter((l) => l.from).map((l) => l.from))
  return { recipe, lines, uses: used.size, need: lines.filter((l) => l.status === 'need').length }
}

/** Recipes that use at least one list item: most of your list first, then fewest extra things to buy. */
export function rankRecipes(recipes, list, { pantry = pantrySet, category = null, limit = 60 } = {}) {
  if (!list.length) return []
  return recipes
    .filter((r) => !category || r.category === category)
    .map((r) => scoreRecipe(r, list, pantry))
    .filter((s) => s.uses > 0)
    .sort((x, y) => y.uses - x.uses || x.need - y.need || x.recipe.name.localeCompare(y.recipe.name))
    .slice(0, limit)
}

/** Fold every ingredient once when the library loads, so ranking stays fast while typing. */
export const prepare = (recipes) => recipes.map((r) => ({ ...r, ingredients: r.ingredients.map((i) => ({ ...i, key: norm(i.name) })) }))
