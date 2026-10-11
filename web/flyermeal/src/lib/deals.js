import { CATALOG } from '@f2r/data/ingredients'
import { needDeal } from '@f2r/lib/needs'
import { matchDeal } from '@f2r/lib/planner'

const CATALOG_ITEMS = Object.values(CATALOG).flat()

/**
 * Best deal for a typed item. Groceries Flyer2Recipes knows ("broccoli", "rice") use its tuned
 * matching, which skips prepared foods (a $12 broccoli side dish); anything else ("dish soap")
 * uses the plain flyer search.
 */
export function bestDeal(name, deals) {
  if (!deals.length) return null
  const n = name.toLowerCase().trim()
  const known = CATALOG_ITEMS.find((i) => i.item === n || i.item === `${n}s` || `${i.item}s` === n || i.as === n)
  return (known && matchDeal(known, deals)) || needDeal(name, deals)
}
