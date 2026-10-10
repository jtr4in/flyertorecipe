// The household's "we need" list ("milk, bread, coffee"). Items a dinner already uses (cheese →
// cheddar) show under that meal; everything else goes straight on the grocery list, with its
// flyer deal when there is one.
import { CATALOG } from '../data/ingredients'
import { dealName } from './stores'
import { assumedSavings, hasSavings, matchDeal } from './planner'

const ALL_INGREDIENTS = Object.values(CATALOG).flat()
const wordRe = (w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?($|[^\\p{L}])`, 'iu')

/** "Salami, cheese\ncereal" → ['salami', 'cheese', 'cereal'] (trimmed, lowercased, no repeats). */
export function parseNeeds(text) {
  return [...new Set(text.split(/[,\n;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))]
}

/** Catalog items a need refers to: "cheese" → cheddar; "chicken" → breasts, thighs, whole. */
export function needItems(need) {
  const n = need.toLowerCase()
  const exact = ALL_INGREDIENTS.filter((i) => i.item === n || i.item === `${n}s` || `${i.item}s` === n)
  if (exact.length) return exact.map((i) => i.item)
  const re = wordRe(n)
  return [...new Set(ALL_INGREDIENTS.filter((i) => re.test(i.item) || matchDeal(i, [{ name: n }])).map((i) => i.item))]
}

// Words that make a flyer item a variety of what was typed: "milk" means plain milk, not
// chocolate or oat milk, unless the person typed that word too.
const VARIETY = /\b(chocolate|chocolat|choco|almond|amande|oat|avoine|soy|soya|coconut|coco|rice|lactose|flavou?red|strawberry|vanilla|caramel|spiced|candy|cookies?|bars?|chips?|snacks?|drink|beverage|sauce|soup|dog|cat|pet|evaporated|evapore|condensed|condense|creamer|cremeur|2 ?go|single serve|rehausseur|whitener|powder|poudre|pods?|filters?|cream|creme|whipping|tea|the)\b/g

/** The flyer deal for a need: the exact item if one was picked, else the best plain search match. */
export function needDeal(need, deals) {
  const n = need.toLowerCase()
  const exact = deals.find((d) => dealName(d.name).toLowerCase() === n)
  if (exact) return exact
  const hits = searchDeals(n, deals)
  const plain = hits.find((d) => !(fold(dealName(d.name)).match(VARIETY) || []).some((w) => !n.includes(w)))
  return plain || hits[0] || null
}

// What people type vs. what flyers print. Each typed word also matches these (English and
// Quebec French flyers), so "homo milk" finds "Natrel 3.25% 4 L" and "tp" finds bathroom tissue.
const SAY = {
  homo: ['homogenized', 'homogénéisé', '3.25%', '3.25 %'],
  homogenized: ['homo', '3.25%'],
  skim: ['skim', 'écrémé', '0%'],
  '2%': ['partly skimmed', 'partiellement écrémé', '2 %'],
  '1%': ['1 %'],
  milk: ['lait'],
  cheese: ['fromage', 'cheddar', 'mozzarella'],
  egg: ['oeufs', 'œufs'],
  eggs: ['oeufs', 'œufs'],
  bread: ['pain', 'loaf', 'bagels', 'buns'],
  butter: ['beurre'],
  yogurt: ['yogourt', 'yoghurt', 'yogurts'],
  chicken: ['poulet'],
  beef: ['boeuf', 'bœuf', 'steak'],
  pork: ['porc'],
  ham: ['jambon'],
  salami: ['pepperoni', 'deli'],
  deli: ['salami', 'ham', 'turkey breast', 'sliced meat'],
  fish: ['poisson', 'salmon', 'tilapia', 'cod', 'haddock'],
  apple: ['pommes'],
  apples: ['pommes'],
  potato: ['pommes de terre', 'potatoes'],
  potatoes: ['pommes de terre'],
  coffee: ['café', 'k-cup', 'k-cups', 'keurig'],
  pop: ['soft drink', 'soda', 'coca-cola', 'pepsi', 'cola'],
  soda: ['soft drink', 'pop'],
  tp: ['bathroom tissue', 'toilet paper'],
  'toilet paper': ['bathroom tissue', 'papier hygiénique'],
  'paper towels': ['paper towel', 'essuie-tout'],
  'dish soap': ['dish', 'dishwashing'],
  diapers: ['couches', 'pampers', 'huggies'],
  detergent: ['laundry', 'tide', 'gain'],
  cereal: ['céréales', 'cheerios', 'flakes', "kellogg's", 'general mills'],
  juice: ['jus'],
  chips: ['croustilles'],
  ice: ['crème glacée'],
  'ice cream': ['crème glacée', 'frozen dessert'],
  oj: ['orange juice', "jus d'orange"],
}

// Quebec flyers write 3,25 %; fold that to 3.25% too.
const fold = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/(\d),(\d)/g, '$1.$2')
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Whole word, plural allowed.
const wholeWord = (w) => new RegExp(/^[\p{L}]/u.test(w) ? `(^|[^\\p{L}])${esc(w)}(s|es|x)?($|[^\\p{L}])` : esc(w), 'iu')
// A typed word matches the start of a word ("mil" → milk); "3.25%"-style words match anywhere.
const wordStart = (w) => new RegExp(/^[\p{L}]/u.test(w) ? `(^|[^\\p{L}])${esc(w)}` : esc(w), 'iu')

/** Typed words (and the phrases people say) with what each also matches. */
function termGroups(term) {
  const t = fold(term).replace(/\s+/g, ' ').trim()
  const phrases = Object.keys(SAY).filter((k) => k.includes(' ') && t.includes(k))
  let rest = t
  for (const ph of phrases) rest = rest.replace(ph, ' ')
  const words = [...phrases, ...rest.split(' ').filter(Boolean)]
  return words.map((w) => {
    const plain = w.replace(/(es|s)$/, '')
    const typed = [w, ...(plain.length > 2 && plain !== w ? [plain] : [])]
    // What people say is matched as whole words ("lait" is milk, "laitue" is lettuce); what's typed
    // can be the start of a word, so the list updates as you type.
    const said = [...(SAY[w] || []), ...(plain !== w ? SAY[plain] || [] : [])].filter((a) => !typed.includes(a))
    return [...new Set(typed.map(fold))].map(wordStart).concat([...new Set(said.map(fold))].map(wholeWord))
  })
}

/**
 * Flyer items for what's being typed. Every typed word has to match the item's name (either
 * language), or the flyer search that found it ("milk" finds "Natrel 3.25% 4 L"). Items that say
 * it in their name rank first, then cheapest.
 */
export function searchDeals(term, deals) {
  const groups = termGroups(term)
  if (!groups.length) return []
  const hits = []
  for (const deal of deals) {
    const name = fold(deal.name || '')
    const found = fold((deal.queries || []).join(' | '))
    let inName = 0
    let ok = true
    for (const alts of groups) {
      if (alts.some((re) => re.test(name))) inName++
      else if (!alts.some((re) => re.test(found))) {
        ok = false
        break
      }
    }
    if (ok) hits.push({ deal, inName })
  }
  return hits.sort((a, b) => b.inName - a.inName || (a.deal.price ?? 1e9) - (b.deal.price ?? 1e9)).map((h) => h.deal)
}

/**
 * As-you-type picks for the last thing typed ("cheese, mil" → milk): the plain word first, then
 * this week's flyer items for it. Each pick is { need, deal }.
 */
export function suggestNeeds(text, deals, taken = [], limit = 40) {
  const term = (text.split(/[,\n;]+/).pop() || '').trim().toLowerCase()
  if (term.length < 2) return []
  const start = wordStart(fold(term))
  const words = [...new Set(ALL_INGREDIENTS.map((i) => i.item).filter((w) => start.test(fold(w))))]
    .sort((a, b) => a.length - b.length)
    .slice(0, 3)
    .map((need) => ({ need, deal: null }))
  const seen = new Set()
  const fromFlyers = searchDeals(term, deals)
    .map((deal) => ({ need: dealName(deal.name).toLowerCase(), deal }))
    .filter((x) => !seen.has(x.need) && seen.add(x.need))
  return [...words, ...fromFlyers].filter((x) => !taken.includes(x.need)).slice(0, limit)
}

/** The catalog items to cook with, for planWeek's `want`. */
export function wantedItems(needs = []) {
  return new Set(needs.flatMap(needItems))
}

/**
 * Where each need ended up: in this week's meals, or as its own grocery list line.
 * Returns { status: [{ need, meals, deal }], group } where group is the list's "From your list".
 */
export function placeNeeds(needs = [], list, deals, picks = {}) {
  const onList = new Map((list?.groups || []).flatMap((g) => g.items).map((i) => [i.key, i]))
  const status = []
  const items = []
  for (const need of needs) {
    const hits = needItems(need).map((k) => onList.get(k)).filter(Boolean)
    if (hits.length) {
      status.push({ need, meals: [...new Set(hits.flatMap((h) => h.meals))], deal: hits.find((h) => h.deal)?.deal || null })
      continue
    }
    // A deal picked from "Other options" wins while it's still in the flyers.
    const deal = (picks[`need:${need}`] && deals.find((d) => d.dealId === picks[`need:${need}`])) || needDeal(need, deals)
    status.push({ need, meals: [], deal })
    items.push({
      key: `need:${need}`,
      item: need,
      buy: '1',
      deal,
      meals: [deal ? dealName(deal.name) : 'Not in this week\'s flyers'],
      cost: deal?.price || 0,
      savings: !deal ? 0 : hasSavings(deal) ? deal.savings : assumedSavings(deal.price || 0),
      estimated: !!deal && !hasSavings(deal),
      need: true,
    })
  }
  return { status, group: items.length ? { title: 'From your list', items } : null }
}

/** The list with "From your list" added and counted (unpriced items add nothing to the total). */
export function withNeeds(list, group) {
  if (!list || !group) return list
  const priced = group.items.filter((i) => i.deal)
  const flyers = [...list.flyers, ...priced.map((i) => ({ item: i.key, deal: i.deal }))]
  return {
    ...list,
    groups: [group, ...list.groups],
    flyers,
    matchStores: [...new Set(flyers.map((f) => f.deal.merchant))].sort(),
    totalCost: Math.round((list.totalCost + priced.reduce((a, i) => a + i.cost, 0)) * 100) / 100,
    totalSavings: Math.round((list.totalSavings + priced.reduce((a, i) => a + i.savings, 0)) * 100) / 100,
    onSale: list.onSale + priced.length,
    itemCount: list.itemCount + group.items.length,
  }
}

/**
 * "curry paste or powder" → ["curry paste", "curry powder"]; "beef or chicken broth" → ["beef
 * broth", "chicken broth"]. A lone word borrows the rest of the phrase from its neighbour.
 */
function pantryAlternatives(item) {
  const alts = item.toLowerCase().split(/\s+or\s+/).map((a) => a.trim()).filter(Boolean)
  if (alts.length < 2) return alts
  const first = alts[0].split(' ')
  const last = alts[alts.length - 1].split(' ')
  return alts.map((a, i) => {
    if (a.includes(' ')) return a
    if (i < alts.length - 1 && last.length > 1) return [a, ...last.slice(1)].join(' ')
    if (i > 0 && first.length > 1) return [...first.slice(0, -1), a].join(' ')
    return a
  })
}

/**
 * A flyer deal for a "check your pantry" item. Stricter than the grocery search: every word has
 * to be in the deal's own name (the flyer search behind it found "cereal" for crackers), and plain
 * products beat varieties, then the cheapest.
 */
// Snacks and baked goods that name a pantry flavour ("sesame seed bagels", "black pepper crackers").
const MADE_WITH = /\b(bagels?|crackers?|chips|bread|muffins?|cookies?|bars?|pretzels?)\b/

export function pantryDeal(item, deals) {
  for (const alt of pantryAlternatives(item)) {
    // Whole words only: "dill" is not "Dillon's gin".
    const words = fold(alt).split(/\s+/).filter(Boolean).map((w) => new RegExp(`(^|[^\\p{L}])${esc(w.replace(/(es|s)$/, ''))}(s|es)?($|[^\\p{L}'’])`, 'iu'))
    if (!words.length) continue
    const hits = deals
      .filter((d) => {
        const name = fold(d.name || '')
        return words.every((re) => re.test(name)) && (!MADE_WITH.test(name) || MADE_WITH.test(alt))
      })
      .sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9))
    const plain = hits.find((d) => !(fold(dealName(d.name)).match(VARIETY) || []).some((w) => !alt.includes(w)))
    if (plain || hits[0]) return plain || hits[0]
  }
  return null
}

/** The list without the items the household already has (taken off with the ✕), totals included. */
export function withoutItems(list, keys = []) {
  if (!list || !keys.length) return list
  const gone = new Set(keys)
  const dropped = list.groups.flatMap((g) => g.items).filter((i) => gone.has(i.key))
  if (!dropped.length) return list
  const sum = (f) => dropped.reduce((a, i) => a + (f(i) || 0), 0)
  const flyers = list.flyers.filter((f) => !gone.has(f.item))
  return {
    ...list,
    groups: list.groups.map((g) => ({ ...g, items: g.items.filter((i) => !gone.has(i.key)) })).filter((g) => g.items.length),
    flyers,
    matchStores: [...new Set(flyers.map((f) => f.deal.merchant))].sort(),
    totalCost: Math.round((list.totalCost - sum((i) => i.cost)) * 100) / 100,
    totalSavings: Math.round((list.totalSavings - sum((i) => i.savings)) * 100) / 100,
    onSale: list.onSale - dropped.filter((i) => i.deal).length,
    itemCount: list.itemCount - dropped.length,
  }
}
