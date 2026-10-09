// The household's "we need" list ("salami, cheese, cereal"). Items the recipes know (cheese →
// cheddar) steer the week's meals toward using them; everything else goes straight on the
// grocery list, with its flyer deal when there is one.
import { CATALOG } from '../data/ingredients'
import { dealName } from './stores'
import { matchDeal } from './planner'

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

/** Cheapest flyer deal whose name mentions the need ("salami" → "Maple Leaf Salami 175 g"). */
export function needDeal(need, deals) {
  const re = wordRe(need.toLowerCase())
  return deals.filter((d) => re.test(d.name || '')).sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9))[0] || null
}

/** The catalog items to cook with, for planWeek's `want`. */
export function wantedItems(needs = []) {
  return new Set(needs.flatMap(needItems))
}

/**
 * Where each need ended up: in this week's meals, or as its own grocery list line.
 * Returns { status: [{ need, meals, deal }], group } where group is the list's "From your list".
 */
export function placeNeeds(needs = [], list, deals) {
  const onList = new Map((list?.groups || []).flatMap((g) => g.items).map((i) => [i.key, i]))
  const status = []
  const items = []
  for (const need of needs) {
    const hits = needItems(need).map((k) => onList.get(k)).filter(Boolean)
    if (hits.length) {
      status.push({ need, meals: [...new Set(hits.flatMap((h) => h.meals))], deal: hits.find((h) => h.deal)?.deal || null })
      continue
    }
    const deal = needDeal(need, deals)
    status.push({ need, meals: [], deal })
    items.push({
      key: `need:${need}`,
      item: need,
      buy: '1',
      deal,
      meals: [deal ? dealName(deal.name) : 'Not in this week\'s flyers'],
      cost: deal?.price || 0,
      savings: deal?.savings || 0,
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
