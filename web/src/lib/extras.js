// Flyer deals that aren't recipe ingredients: frozen meals, paper towels, coffee, diapers.
// They're sorted into categories by flyer words, can be watched by name, and the ones the
// household adds go on the grocery list as an "Extras" group.
import { dealName } from './stores'
import { assumedSavings, hasSavings } from './planner'

// First category whose words match wins, so "dish soap" lands in cleaning, not personal care.
export const EXTRA_CATEGORIES = [
  {
    id: 'frozen', label: 'Frozen meals', emoji: '🧊',
    match: ['frozen meal', 'frozen dinner', 'frozen entrée', 'frozen entree', 'pizza', 'lasagna', 'lasagne', 'pot pie', 'perogies', 'pierogi', 'fish sticks', 'nuggets', 'burritos', 'dumplings', 'fries', 'frozen potato', 'waffles', 'surgelé', 'surgelée', 'frozen pasta', 'veggie burgers', 'plant-based bites'],
    exclude: ['vegetables', 'légumes', 'cheese', 'fromage', 'fruit', 'dough', 'sauce', 'shrimp', 'salmon'],
  },
  {
    id: 'cleaning', label: 'Paper & cleaning', emoji: '🧻',
    match: ['toilet paper', 'bathroom tissue', 'paper towel', 'facial tissue', 'kleenex', 'laundry', 'detergent', 'dish soap', 'dishwasher', 'cleaner', 'garbage bag', 'trash bag', 'tide', 'cascade', 'bounty', 'charmin', 'cashmere', 'royale', 'sponge', 'aluminum foil', 'plastic wrap', 'ziploc', 'fabric softener', 'bleach', 'lysol', 'papier hygiénique', 'essuie-tout'],
    exclude: [],
  },
  {
    id: 'personal', label: 'Personal care', emoji: '🧴',
    match: ['shampoo', 'conditioner', 'body wash', 'bar soap', 'hand soap', 'toothpaste', 'toothbrush', 'deodorant', 'razor', 'lotion', 'mouthwash', 'floss', 'vitamins', 'sunscreen', 'colgate', 'crest', 'dove', 'gillette', 'pads', 'tampons'],
    exclude: ['dish', 'dog', 'cat'],
  },
  {
    id: 'baby', label: 'Baby', emoji: '🍼',
    match: ['diapers', 'diaper', 'baby wipes', 'wipes', 'formula', 'pampers', 'huggies', 'baby food', 'couches'],
    exclude: ['lysol', 'disinfecting'],
  },
  {
    id: 'pet', label: 'Pet', emoji: '🐾',
    match: ['dog food', 'cat food', 'pet food', 'cat litter', 'litter', 'dog treats', 'cat treats', 'purina', 'friskies', 'iams', 'pedigree', 'whiskas', 'temptations'],
    exclude: [],
  },
  {
    id: 'breakfast', label: 'Coffee & breakfast', emoji: '☕',
    match: ['coffee', 'k-cup', 'k-cups', 'keurig', 'nespresso', 'tea', 'cereal', 'cheerios', 'corn flakes', "kellogg's", 'general mills', 'pancake mix', 'syrup', 'café'],
    exclude: ['cake', 'iced tea', 'ice cream', 'creamer'],
  },
  {
    id: 'snacks', label: 'Snacks & drinks', emoji: '🥤',
    match: ['juice', 'soft drink', 'pop', 'soda', 'sparkling water', 'coca-cola', 'pepsi', 'iced tea', 'chips', 'croustilles', 'crackers', 'granola bars', 'bars', 'cookies', 'chocolate', 'candy', 'popcorn', 'water'],
    exclude: ['juicer', 'chocolate milk', 'chocolate chips', 'milk'],
  },
]

const wordRe = (w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?($|[^\\p{L}])`, 'iu')
const RES = new Map()
const re = (w) => RES.get(w) || RES.set(w, wordRe(w)).get(w)
const hit = (name, words) => words.some((w) => re(w).test(name))

export function categorize(deal) {
  const name = deal?.name || ''
  return EXTRA_CATEGORIES.find((c) => hit(name, c.match) && !hit(name, c.exclude))?.id || null
}

/** Deals with a category, cheapest-looking (biggest saving) first within each. */
export function extraDeals(deals) {
  return deals
    .map((deal) => ({ deal, category: categorize(deal) }))
    .filter((x) => x.category)
    .sort((a, b) => (b.deal.savings || 0) - (a.deal.savings || 0))
}

// Flyers name some things differently than people do.
const SYNONYMS = {
  'toilet paper': ['bathroom tissue', 'papier hygiénique'],
  'paper towels': ['paper towel', 'essuie-tout'],
  'paper towel': ['paper towels', 'essuie-tout'],
  diapers: ['couches'],
  'laundry detergent': ['laundry', 'detergent'],
  'dog food': ['purina', 'pedigree'],
  'cat food': ['friskies', 'whiskas', 'purina'],
}

/** Watched words ("toilet paper", "coffee") with the deals that mention them. */
export function watchMatches(deals, watch = []) {
  return watch.map((term) => {
    const words = [term.toLowerCase(), ...(SYNONYMS[term.toLowerCase()] || [])]
    return { term, deals: deals.filter((d) => hit(d.name || '', words)) }
  })
}

/** The grocery list with the household's added extras as one more group, counted in the totals. */
export function withExtras(list, extras = []) {
  if (!list || !extras.length) return list
  const items = extras.map(({ deal, category }) => ({
    key: `extra:${deal.dealId}`,
    item: dealName(deal.name),
    buy: '1',
    deal,
    meals: [EXTRA_CATEGORIES.find((c) => c.id === category)?.label || 'Extra'],
    cost: deal.price || 0,
    savings: hasSavings(deal) ? deal.savings : assumedSavings(deal.price || 0),
    estimated: !hasSavings(deal),
    extra: true,
  }))
  const flyers = [...list.flyers, ...items.map((i) => ({ item: i.key, deal: i.deal }))]
  return {
    ...list,
    groups: [...list.groups, { title: 'Extras', items }],
    flyers,
    matchStores: [...new Set(flyers.map((f) => f.deal.merchant))].sort(),
    totalCost: Math.round((list.totalCost + items.reduce((a, i) => a + i.cost, 0)) * 100) / 100,
    totalSavings: Math.round((list.totalSavings + items.reduce((a, i) => a + i.savings, 0)) * 100) / 100,
    onSale: list.onSale + items.length,
    itemCount: list.itemCount + items.length,
  }
}
