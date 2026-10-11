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
  item('facial tissue', '🤧', ['facial tissue', 'kleenex', 'papiers-mouchoirs', 'scotties'], []),
  item('aluminum foil', '🥡', ['aluminum foil', "papier d'aluminium", 'reynolds wrap'], ['pan', 'tray', 'container']),
  item('plastic wrap', '🥡', ['plastic wrap', 'cling wrap', 'saran'], []),
  item('sandwich bags', '🥪', ['sandwich bag', 'ziploc', 'freezer bag'], []),
  item('all-purpose cleaner', '🧴', ['all-purpose cleaner', 'all purpose cleaner', 'lysol', 'mr. clean', 'windex', 'vim'], ['wipes']),
]

export const STAPLES = [
  item('milk', '🥛', ['milk', 'lait'], ['chocolate', 'almond', 'oat', 'soy', 'coconut', 'condensed', 'evaporated', 'powder', 'cream', 'tea', 'cake', 'rusk', 'bread', 'shake', 'veal', 'veau', 'carnation', 'choc', 'beverage', 'lactose', 'protein', '2go', 'moules', 'biscuit', 'chocolat']),
  item('eggs', '🥚', ['eggs', 'oeufs', 'œufs', 'large eggs'], ['noodle', 'nog', 'chocolate', 'quail', 'plant', 'yolk', 'roll']),
  item('bread', '🍞', ['bread', 'pain tranché', 'loaf'], ['crumb', 'garlic', 'banana', 'cheese', 'focaccia', 'naan', 'pita', 'machine', 'maker', 'muffins', 'sticks', 'custard', 'puff']),
  item('butter', '🧈', ['butter', 'beurre'], ['peanut', 'almond', 'apple', 'cookie', 'chicken', 'lettuce', 'popcorn', 'croissant', 'tart', 'cup', 'buns', 'topped', 'garlic', 'margarine', 'arachide', 'sour cream', 'biscuit', 'chocolat', 'tartinade', 'ail']),
  item('coffee', '☕', ['coffee', 'café', 'k-cup', 'keurig'], ['creamer', 'crème', 'creme', 'rehausseur', 'mousse', 'international delight', 'maker', 'machine', 'cake', 'mug', 'filter', 'table', 'iced']),
  item('bananas', '🍌', ['banana', 'bananes'], ['bread', 'chips', 'muffin', 'yogurt', 'cream', 'sauce']),
  item('cheese', '🧀', ['cheddar', 'marble cheese', 'mozzarella', 'cheese bars', 'shredded cheese', 'cheese slices', 'sliced cheese', 'mozzarellissima'], ['cream cheese', 'cake', 'sauce', 'dip', 'crackers', 'macaroni', 'pizza', 'bread', 'puffs', 'dippers', 'samosa', 'pasta', 'tortellini', 'cannelloni']),
  item('yogurt', '🥣', ['yogurt', 'yogourt'], ['dog', 'bar', 'covered', 'drink', 'drinkable', 'raisins', 'pretzel', 'drink']),
  item('apples', '🍎', ['apples', 'pommes'], ['juice', 'sauce', 'pie', 'cider', 'chips', 'terre', 'sausage', 'butter', 'thé', 'snack', 'collation']),
  item('potatoes', '🥔', ['potatoes', 'pommes de terre'], ['sweet', 'chips', 'fries', 'frozen', 'mashed', 'betty crocker', 'mccain', 'salad', 'starch', 'twice', 'scalloped', 'gratin']),
  item('onions', '🧅', ['onions', 'oignons'], ['green', 'rings', 'soup', 'dip', 'fried', 'pearl', 'verts', 'radis']),
  item('rice', '🍚', ['rice', 'riz'], ['cake', 'krispies', 'vinegar', 'noodle', 'cooker', 'served', 'masala', 'chana', 'pudding', 'crackers', 'chips']),
  item('pasta', '🍝', ['pasta', 'spaghetti', 'penne', 'pâtes'], ['sauce', 'salad', 'squash', 'meal', 'frozen', 'stuffed', 'chicken', 'shrimp', 'beef', 'farcies', 'dinner', 'dîner', 'bake', 'fraîches']),
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

/** This week's deals that really are this thing, best pick first. */
export function dealsFor(entry, deals) {
  return deals
    .filter((d) => {
      const name = fold(d.name)
      return hit(name, entry.match) && !hit(name, entry.exclude)
    })
    // On sale with a stated saving first, then the lowest shelf price (a dozen eggs before 180).
    .sort((a, b) => Number(b.savings > 0) - Number(a.savings > 0) || (a.price ?? 1e9) - (b.price ?? 1e9))
}

const onList = (list, name) => list.some((l) => fold(l) === fold(name) || fold(l) === `${fold(name)}s` || `${fold(l)}s` === fold(name))

/**
 * Suggestions for this list: { pairs, household, staples }, each [{ name, emoji, deal, because }].
 * Household and staples only show what's on sale this week (with no deals at all, the first few),
 * so the panel is about savings, not a checklist of everything a home could need.
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
    return (onSale.length ? onSale : rows).slice(0, max)
  }
  return { pairs: pairs.slice(0, max), household: pick(HOUSEHOLD), staples: pick(STAPLES) }
}
