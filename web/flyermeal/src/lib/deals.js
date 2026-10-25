import { CATALOG } from '@f2r/data/ingredients'
import { isPlain, namesIt, needDeal } from '@f2r/lib/needs'
import { matchDeal } from '@f2r/lib/planner'
import { HOUSEHOLD, STAPLES, dealsFor } from './recommend'

const CATALOG_ITEMS = Object.values(CATALOG).flat()

/**
 * Best deal for a typed item. Everyday things we've listed (coffee, toilet paper) use their own
 * flyer words, so "coffee" isn't coffee cream. Groceries Flyer2Recipes knows ("broccoli", "rice")
 * use its tuned matching, which skips prepared foods (a $12 broccoli side dish). Anything else
 * ("maple syrup") uses the plain flyer search.
 */
export function bestDeal(name, deals) {
  if (!deals.length) return null
  const n = name.toLowerCase().trim()
  const everyday = [...STAPLES, ...HOUSEHOLD].find((e) => e.name === n || e.name === `${n}s` || `${e.name}s` === n)
  if (everyday) return dealsFor(everyday, deals)[0] || null
  const known = CATALOG_ITEMS.find((i) => i.item === n || i.item === `${n}s` || `${i.item}s` === n || i.as === n)
  // The tuned match can land on a neighbour (thighs → drumsticks) or a flavour ("greens powder
  // strawberry banana" for bananas); a plain ad that says what was typed wins.
  const tuned = known && matchDeal(known, deals)
  if (tuned && namesIt(n, tuned) && isPlain(n, tuned)) return tuned
  const plain = needDeal(name, deals)
  return (plain && namesIt(n, plain) ? plain : tuned || plain) || null
}
