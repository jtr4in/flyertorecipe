// "You might also need": real everyday things, never random flyer items. Three short lists a
// person would recognize: what goes with what's on the list, household basics, and food staples.

// Each entry: what goes on the list, an emoji, and the flyer words that really mean that thing
// (English and Quebec French), with words that mean it's something else.
const item = (name, emoji, match, exclude = []) => ({ name, emoji, match, exclude })

export const HOUSEHOLD = [
  item('toilet paper', '🧻', ['toilet paper', 'bathroom tissue', 'papier hygiénique', 'charmin', 'cashmere', 'royale bathroom'], ['wipes']),
  item('paper towels', '🧻', ['paper towel', 'essuie-tout', 'bounty'], ['dispenser', 'holder']),
  item('dish soap', '🧽', ['dish soap', 'dishwashing liquid', 'dish liquid', 'savon à vaisselle', 'dawn', 'palmolive'], ['dishwasher', 'rack', 'paratha']),
  item('dishwasher detergent', '🍽️', ['dishwasher detergent', 'dishwasher pods', 'cascade', 'finish quantum', 'finish powerball'], ['orchid', 'orchidée']),
  item('laundry detergent', '🧺', ['laundry detergent', 'tide', 'gain', 'persil', 'arm & hammer laundry', 'détergent à lessive'], ['fabric softener', 'dryer', 'scallops', 'frozen']),
  item('garbage bags', '🗑️', ['garbage bag', 'trash bag', 'glad', 'sacs à ordures'], ['wrap', 'freezer', 'sandwich', 'zipper', 'plates', 'bowls']),
  item('hand soap', '🧼', ['hand soap', 'savon pour les mains', 'softsoap'], ['dish']),
  item('toothpaste', '🪥', ['toothpaste', 'dentifrice', 'colgate', 'crest'], ['toothbrush', 'brush', 'floss', 'mouthwash']),
  item('shampoo', '🧴', ['shampoo', 'shampooing'], ['dog', 'carpet']),
  item('deodorant', '🧴', ['deodorant', 'antiperspirant', 'déodorant'], []),
  item('facial tissue', '🤧', ['facial tissue', 'kleenex', 'papiers-mouchoirs', 'mouchoirs'], []),
  item('aluminum foil', '🥡', ['aluminum foil', "papier d'aluminium", 'reynolds wrap'], ['pan', 'tray', 'container']),
  item('plastic wrap', '🥡', ['plastic wrap', 'cling wrap', 'saran'], []),
  item('sandwich bags', '🥪', ['sandwich bag', 'ziploc', 'freezer bag'], []),
  item('all-purpose cleaner', '🧴', ['all-purpose cleaner', 'all purpose cleaner', 'lysol', 'mr. clean', 'windex', 'vim'], ['wipes']),
  item('fabric softener', '🧺', ['fabric softener', 'dryer sheets', 'downy', 'bounce', 'snuggle', 'assouplissant'], []),
  item('bleach', '🧴', ['bleach', 'javel', 'clorox'], ['wipes']),
  item('disinfecting wipes', '🧻', ['disinfecting wipes', 'lysol wipes', 'clorox wipes', 'lingettes désinfectantes'], []),
  item('sponges', '🧽', ['sponge', 'scotch-brite', 'éponge'], ['towel', 'sponge towels', 'spongetowels', 'cake']),
  item('toothbrushes', '🪥', ['toothbrush', 'brosse à dents'], []),
  item('mouthwash', '🫧', ['mouthwash', 'rince-bouche', 'listerine'], []),
  item('body wash', '🧼', ['body wash', 'gel douche'], []),
  item('conditioner', '🧴', ['conditioner', 'revitalisant'], ['air', 'fabric']),
  item('razors', '🪒', ['razor', 'razors', 'rasoir', 'gillette', 'schick'], []),
  item('cotton swabs', '🦻', ['cotton swabs', 'q-tips', 'cotons-tiges'], []),
  item('batteries', '🔋', ['batteries', 'duracell', 'energizer', 'piles'], ['car']),
  item('napkins', '🧻', ['napkins', 'serviettes de table'], ['sanitary']),
  item('parchment paper', '🥡', ['parchment paper', 'papier parchemin'], []),
]

export const STAPLES = [
  item('milk', '🥛', ['milk', 'lait'], ['chocolate', 'almond', 'oat', 'soy', 'coconut', 'condensed', 'evaporated', 'powder', 'cream', 'tea', 'cake', 'rusk', 'bread', 'shake', 'veal', 'veau', 'carnation', 'choc', 'beverage', 'lactose', 'protein', '2go', 'moules', 'biscuit', 'chocolat']),
  item('eggs', '🥚', ['eggs', 'oeufs', 'œufs', 'large eggs'], ['noodle', 'nog', 'chocolate', 'quail', 'plant', 'yolk', 'roll']),
  item('bread', '🍞', ['bread', 'pain tranché', 'loaf'], ['crumb', 'stuffing', 'garlic', 'banana', 'cheese', 'focaccia', 'naan', 'pita', 'machine', 'maker', 'muffins', 'sticks', 'custard', 'puff']),
  item('butter', '🧈', ['butter', 'beurre'], ['peanut', 'almond', 'apple', 'cookie', 'chicken', 'lettuce', 'popcorn', 'croissant', 'tart', 'cup', 'buns', 'topped', 'garlic', 'margarine', 'arachide', 'sour cream', 'biscuit', 'chocolat', 'tartinade', 'ail']),
  item('coffee', '☕', ['coffee', 'café', 'k-cup', 'keurig'], ['creamer', 'crème', 'creme', 'crémier', 'cremier', 'rehausseur', 'mousse', 'international delight', 'maker', 'machine', 'cake', 'mug', 'filter', 'table', 'iced']),
  item('bananas', '🍌', ['banana', 'bananes'], ['bread', 'chips', 'muffin', 'yogurt', 'cream', 'sauce']),
  item('cheese', '🧀', ['cheddar', 'marble cheese', 'mozzarella', 'cheese bars', 'shredded cheese', 'cheese slices', 'sliced cheese', 'mozzarellissima'], ['cream cheese', 'cake', 'sauce', 'dip', 'crackers', 'macaroni', 'pizza', 'bread', 'puffs', 'dippers', 'samosa', 'pasta', 'tortellini', 'cannelloni']),
  item('yogurt', '🥣', ['yogurt', 'yogourt'], ['dog', 'bar', 'covered', 'drink', 'drinkable', 'raisins', 'pretzel', 'drink']),
  item('apples', '🍎', ['apples', 'pommes'], ['juice', 'sauce', 'pie', 'cider', 'chips', 'terre', 'sausage', 'butter', 'thé', 'snack', 'collation']),
  item('potatoes', '🥔', ['potatoes', 'pommes de terre'], ['sweet', 'chips', 'fries', 'frozen', 'mashed', 'betty crocker', 'mccain', 'salad', 'starch', 'twice', 'scalloped', 'gratin']),
  item('onions', '🧅', ['onions', 'oignons'], ['green', 'rings', 'soup', 'dip', 'fried', 'pearl', 'verts', 'radis']),
  item('rice', '🍚', ['rice', 'riz'], ['cake', 'krispies', 'vinegar', 'noodle', 'cooker', 'served', 'masala', 'chana', 'pudding', 'crackers', 'chips']),
  item('pasta', '🍝', ['pasta', 'spaghetti', 'penne', 'pâtes'], ['sauce', 'salad', 'squash', 'meal', 'frozen', 'stuffed', 'chicken', 'shrimp', 'beef', 'farcies', 'dinner', 'dîner', 'bake', 'fraîches']),
  item('cereal', '🥣', ['cereal', 'céréales', 'cheerios', 'corn flakes', 'special k', 'honey nut'], ['bars', 'bar', 'barres', 'baby', 'cerelac']),
  item('peanut butter', '🥜', ['peanut butter', "beurre d'arachide", 'kraft peanut', 'skippy'], ['cups', 'cookies', 'chocolate', 'bars', 'dog', 'margarine']),
  item('chicken breasts', '🍗', ['chicken breast', 'poitrines de poulet', 'poitrine de poulet'], ['breaded', 'nuggets', 'stuffed', 'roast', 'rôti', 'deli', 'sliced', 'strips', 'frozen chicken breast, 5kg']),
  item('ground beef', '🥩', ['ground beef', 'boeuf haché', 'bœuf haché'], ['burgers', 'bites', 'patties']),
  item('frozen vegetables', '🥦', ['frozen vegetables', 'mixed vegetables', 'légumes surgelés'], ['pizza', 'meal', 'canned', 'ml']),
  item('canned tomatoes', '🥫', ['canned tomatoes', 'diced tomatoes', 'crushed tomatoes', 'tomates en dés', 'tomates broyées', 'hunts tomatoes', 'unico tomatoes'], ['soup', 'sauce']),
  item('pasta sauce', '🍅', ['pasta sauce', 'sauce pour pâtes', 'ragu', 'classico', 'prego'], ['meal', 'pasta,']),
  item('carrots', '🥕', ['carrots', 'carottes'], ['cake', 'juice', 'glazed', 'muffin', 'citron', 'ml']),
  item('tomatoes', '🍅', ['tomatoes', 'tomates'], ['canned', 'diced', 'crushed', 'sauce', 'paste', 'soup', 'juice', 'sun-dried', 'ketchup', 'ml', 'cocktail', 'strained']),
  item('lettuce', '🥬', ['lettuce', 'romaine', 'laitue'], ['kit', 'salad kit', 'wraps']),
  item('cucumbers', '🥒', ['cucumber', 'concombre'], ['pickles', 'kimchi', 'water']),
  item('strawberries', '🍓', ['strawberries', 'fraises'], ['jam', 'yogurt', 'cake', 'shortcake', 'juice', 'cereal', 'dried', 'frozen']),
  item('orange juice', '🧃', ['orange juice', "jus d'orange", 'tropicana', 'oasis orange', 'simply orange'], ['drink', 'cocktail', 'punch']),
  item('sour cream', '🥛', ['sour cream', 'crème sure'], ['chips', 'dip', 'onion']),
  item('oats', '🥣', ['quaker oats', 'rolled oats', 'quick oats', 'flocons d\'avoine', 'oatmeal'], ['bars', 'cookies', 'instant oatmeal bars', 'milk', 'drink']),
  item('tortillas', '🌯', ['tortillas', 'wraps'], ['chips', 'croustilles', 'poulet', 'césar', 'aïoli', 'chicken', 'lettuce', 'wiener', 'crescents']),
  item('cooking oil', '🫒', ['vegetable oil', 'canola oil', 'olive oil', 'huile'], ['spray', 'tuna', 'sardines', 'motor', 'massage', 'essential', 'hair', 'packed']),
  item('ketchup', '🍅', ['ketchup'], ['chips', 'croustilles']),
  item('mayonnaise', '🥪', ['mayonnaise', 'mayo', 'hellmann'], ['chipotle mayo dip']),
  item('granola bars', '🍫', ['granola bars', 'barres tendres', 'nature valley', 'quaker chewy', 'nutri-grain'], []),
]

// Things people buy together, by a word on the list → what usually goes with it.
export const PAIRS = [
  [['pasta', 'spaghetti', 'penne', 'noodles'], ['pasta sauce', 'parmesan']],
  [['tortilla', 'taco', 'fajita', 'burrito'], ['salsa', 'shredded cheese', 'sour cream']],
  [['nachos', 'tortilla chips'], ['salsa', 'shredded cheese']],
  [['ground beef', 'burger', 'hamburger'], ['hamburger buns', 'cheese slices', 'lettuce']],
  [['hot dog', 'wiener'], ['hot dog buns', 'mustard']],
  [['cereal', 'granola'], ['milk', 'bananas']],
  [['coffee'], ['cream', 'milk']],
  [['tea'], ['milk', 'honey']],
  [['bagel'], ['cream cheese']],
  [['pancake'], ['maple syrup', 'eggs']],
  [['lettuce', 'salad', 'romaine'], ['salad dressing', 'cucumber', 'tomatoes']],
  [['chips'], ['dip', 'salsa']],
  [['peanut butter'], ['bread', 'jam']],
  [['steak'], ['potatoes', 'mushrooms']],
  [['pizza dough'], ['pizza sauce', 'mozzarella']],
  [['oats', 'oatmeal'], ['bananas', 'berries']],
  [['diapers'], ['baby wipes']],
  [['chicken wings', 'wings'], ['celery', 'ranch dressing']],
  [['turkey'], ['cranberry sauce', 'stuffing mix', 'gravy']],
  [['ham'], ['potatoes', 'green beans']],
]

const fold = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const RES = new Map()
const re = (w) => RES.get(w) || RES.set(w, new RegExp(`(^|[^\\p{L}])${esc(fold(w))}(s|es|x)?($|[^\\p{L}])`, 'iu')).get(w)
const hit = (name, words) => words.some((w) => re(w).test(name))
// One ad for several products, read from its longest part (bilingual ads repeat after a |).
// One ad for several products, read from its longest part (bilingual ads repeat after a |), or one
// that also names another kind of the same thing ("bathroom tissue" in a facial tissue ad).
const combo = (d, entry) => {
  const name = fold(d.name)
  if (/ or | ou |, (?=[a-z])/.test(name.split('|').sort((a, b) => b.length - a.length)[0])) return 1
  const count = (w) => (name.match(new RegExp(re(w).source, 'giu')) || []).length
  return Number(entry.match.some((m) => m.includes(' ') && count(m) > 0 && count(m.split(' ').at(-1)) > count(m)))
}

// Answers per deals array, so retyping or re-rendering never re-scans thousands of flyer ads.
const MEMO = new WeakMap()
const memoFor = (deals) => MEMO.get(deals) || MEMO.set(deals, { names: deals.map((d) => fold(d.name)), hits: new Map() }).get(deals)

/** This week's deals that really are this thing, best pick first. */
export function dealsFor(entry, deals) {
  const memo = memoFor(deals)
  const key = `${entry.match}|${entry.exclude}`
  if (memo.hits.has(key)) return memo.hits.get(key)
  const found = deals
    .filter((d, i) => {
      const name = memo.names[i]
      return hit(name, entry.match) && !hit(name, entry.exclude)
    })
    // Ads for just this thing before ads for several products ("bathroom tissue, paper towels or
    // facial tissue"), then on sale with a stated saving, then the lowest shelf price.
    .sort((a, b) => combo(a, entry) - combo(b, entry) || Number(b.savings > 0) - Number(a.savings > 0) || (a.price ?? 1e9) - (b.price ?? 1e9))
  memo.hits.set(key, found)
  return found
}

const onList = (list, name) => list.some((l) => fold(l) === fold(name) || fold(l) === `${fold(name)}s` || `${fold(l)}s` === fold(name))

/**
 * Suggestions for this list: { pairs, household, staples }, each [{ name, emoji, deal, because }].
 * Household and staples hold every entry on sale this week (with no deals at all, every entry), so
 * the panel is about savings, not a checklist; the screen shows a few and loads more on request.
 */
export function recommend(list, deals, { max = 6 } = {}) {
  const text = list.map(fold)
  const pairs = []
  for (const [triggers, goes] of PAIRS) {
    const because = list.find((l, i) => triggers.some((t) => re(t).test(text[i])))
    if (!because) continue
    for (const name of goes) {
      if (onList(list, name) || pairs.some((p) => p.name === name)) continue
      const entry = [...STAPLES, ...HOUSEHOLD].find((e) => e.name === name) || item(name, '🛒', [name])
      pairs.push({ name, emoji: entry.emoji, deal: dealsFor(entry, deals)[0] || null, because })
    }
  }
  const pick = (entries) => {
    const rows = entries.filter((e) => !onList(list, e.name)).map((e) => ({ name: e.name, emoji: e.emoji, deal: dealsFor(e, deals)[0] || null }))
    const onSale = rows.filter((r) => r.deal)
    return onSale.length ? onSale : rows
  }
  return { pairs: pairs.slice(0, max), household: pick(HOUSEHOLD), staples: pick(STAPLES) }
}
