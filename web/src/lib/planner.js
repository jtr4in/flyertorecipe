// Rule-based meal planner: score seed recipes by how many of their ingredients
// are on sale at the household's stores, pick a varied week, then build an
// aisle-grouped shopping list. Pure functions, no Firebase, so it is unit-testable.
import { AISLES } from './aisles'

// Words that mean a deal is not the raw ingredient ("chicken" vs "chicken broth").
const GLOBAL_EXCLUDE = ['seasoning', 'flavour', 'flavor', 'chips', 'crackers', 'soup', 'pet food', 'dog', 'cat food', 'baby']

const wordRe = (w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')

export function activeDeals(deals, { stores = [], today = new Date() } = {}) {
  const day = today.toISOString().slice(0, 10)
  const wanted = stores.map((s) => s.toLowerCase())
  return deals.filter((d) => {
    if (d.validTo && d.validTo.slice(0, 10) < day) return false
    if (d.validFrom && d.validFrom.slice(0, 10) > day) return false
    if (wanted.length && !wanted.some((s) => (d.merchant || '').toLowerCase().includes(s))) return false
    return true
  })
}

/** Cheapest deal whose name matches the ingredient, or null. */
export function matchDeal(ingredient, deals) {
  if (ingredient.pantry) return null
  const include = ingredient.match.map(wordRe)
  const exclude = [...GLOBAL_EXCLUDE, ...(ingredient.exclude || [])].map(wordRe)
  let best = null
  for (const d of deals) {
    if (!include.some((r) => r.test(d.name))) continue
    if (exclude.some((r) => r.test(d.name))) continue
    if (!best || d.price < best.price) best = d
  }
  return best
}

export function fitsDiet(recipe, diet) {
  return diet.every((tag) => recipe.tags.includes(tag))
}

export function scoreRecipe(recipe, deals) {
  const buyable = recipe.ingredients.filter((i) => !i.pantry)
  let weight = 0
  let hit = 0
  let savings = 0
  const matches = {}
  for (const ing of buyable) {
    const w = ing.main ? 3 : 1
    weight += w
    const deal = matchDeal(ing, deals)
    if (deal) {
      hit += w
      savings += deal.savings || 0
      matches[ing.item] = deal
    }
  }
  // Coverage dominates; savings break ties between similarly covered recipes.
  const score = weight ? (hit / weight) * 10 + Math.min(savings, 10) * 0.3 : 0
  return { score, matches, savings }
}

/** Pick `mealsPerWeek` recipes, no repeats, at most 2 dinners per protein. */
export function planWeek(recipes, deals, prefs) {
  const scored = recipes
    .filter((r) => fitsDiet(r, prefs.diet || []))
    .map((r) => ({ recipe: r, ...scoreRecipe(r, deals) }))
    .sort((a, b) => b.score - a.score)

  const perProtein = {}
  const plan = []
  for (const s of scored) {
    if (plan.length >= prefs.mealsPerWeek) break
    const p = s.recipe.protein
    if ((perProtein[p] || 0) >= 2) continue
    perProtein[p] = (perProtein[p] || 0) + 1
    plan.push(s)
  }
  // If variety rules left gaps, fill with the best remaining recipes.
  for (const s of scored) {
    if (plan.length >= prefs.mealsPerWeek) break
    if (!plan.includes(s)) plan.push(s)
  }
  return plan
}

// You can't buy half a head of broccoli: round countable units up, weights to the nearest 1/4.
const COUNT_UNITS = ['each', 'can', 'head', 'block', 'pack', 'bag', 'loaf', 'tub']
const round = (n, unit) => (COUNT_UNITS.includes(unit) ? Math.ceil(n - 0.01) : Math.round(n * 4) / 4 || 0.25)

/** Aggregate ingredients across the plan, scaled to household size, grouped by aisle. */
export function buildShoppingList(plan, deals, prefs) {
  const items = new Map()
  const pantry = new Set()
  for (const { recipe } of plan) {
    const factor = prefs.householdSize / recipe.servings
    for (const ing of recipe.ingredients) {
      if (ing.pantry) {
        pantry.add(ing.item)
        continue
      }
      const key = `${ing.item}|${ing.unit}`
      const row = items.get(key) || { ...ing, qty: 0, recipes: [] }
      row.qty += ing.qty * factor
      row.recipes.push(recipe.name)
      items.set(key, row)
    }
  }

  let totalSavings = 0
  let onSale = 0
  const byAisle = {}
  for (const row of items.values()) {
    const deal = matchDeal(row, deals)
    const aisle = deal?.aisle || row.aisle || 'Other'
    // Savings are per flyer item; we assume one pack per list line, so this is an estimate.
    const savings = deal?.savings || 0
    totalSavings += savings
    if (deal) onSale += 1
    ;(byAisle[aisle] ||= []).push({ ...row, qty: round(row.qty, row.unit), deal, savings })
  }

  const aisles = AISLES.filter((a) => byAisle[a]).map((a) => ({
    aisle: a,
    items: byAisle[a].sort((x, y) => x.item.localeCompare(y.item)),
  }))
  return {
    aisles,
    pantry: [...pantry].sort(),
    totalSavings: Math.round(totalSavings * 100) / 100,
    onSale,
    itemCount: items.size,
  }
}
