// Rule-based meal planner: score seed recipes by how many of their ingredients
// are on sale at the household's stores, pick a varied week, then build an
// aisle-grouped shopping list. Pure functions, no Firebase, so it is unit-testable.
import { AISLES } from './aisles'

// Words that mean a deal is not the raw ingredient ("chicken" vs "chicken broth").
const GLOBAL_EXCLUDE = ['seasoning', 'flavour', 'flavor', 'flavoured', 'flavored', 'chips', 'crackers', 'soup', 'beverage', 'drink', 'pet food', 'dog', 'cat food', 'baby']

// Whole words, plurals allowed: "bun" matches "buns" but not "bunch".
const wordRe = (w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es)?\\b`, 'i')

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

// Put per-weight prices on one scale so $2.59/100 g doesn't beat $4.99/lb.
const PER_LB = { '/lb': 1, '/kg': 1 / 2.2046, '/100 g': 4.536 }
const comparable = (d) => d.price * (PER_LB[d.unit] ?? 1)

// Flyer listings often bundle products: "SEEDLESS ORANGES, MINI WHITE OR YELLOW POTATOES".
// A match near the start of a name (or of its English half after "|") is the headline
// product; a match buried at the end is only a fallback.
function isHeadline(name, include) {
  return name.split('|').some((part) => include.some((r) => {
    const m = r.exec(part.trim())
    return m && m.index < 25
  }))
}

/** Cheapest matching deal, preferring ones where the ingredient is the headline product. */
export function matchDeal(ingredient, deals) {
  if (ingredient.pantry) return null
  const include = ingredient.match.map(wordRe)
  const exclude = [...GLOBAL_EXCLUDE, ...(ingredient.exclude || [])].map(wordRe)
  let best = null
  let bestRank = null
  for (const d of deals) {
    if (!include.some((r) => r.test(d.name))) continue
    if (exclude.some((r) => r.test(d.name))) continue
    const rank = [isHeadline(d.name, include) ? 0 : 1, comparable(d)]
    if (!best || rank[0] < bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1])) {
      best = d
      bestRank = rank
    }
  }
  return best
}

export function fitsDiet(recipe, diet) {
  return diet.every((tag) => recipe.tags.includes(tag))
}

// ---------- Filters ----------

// Quick filters shown as chips. Each is a predicate on a recipe.
export const FILTERS = [
  { id: 'quick', label: 'Quick (≤25 min)', emoji: '⚡', test: (r) => r.minutes <= 25 },
  { id: 'high-protein', label: 'High protein', emoji: '💪', test: (r) => r.tags.includes('high-protein') },
  { id: 'kid-approved', label: 'Kid-approved', emoji: '🧒', test: (r) => r.tags.includes('kid-approved') },
  { id: 'big-batch', label: 'Big batch', emoji: '🍲', test: (r) => r.tags.includes('big-batch') },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥦', test: (r) => r.tags.includes('vegetarian') },
]

/**
 * Turn "15 min dinners under $50, high protein" into filters + a budget.
 * Keyword rules only; an LLM could replace this later without changing callers.
 */
export function parsePlanQuery(q) {
  const text = (q || '').toLowerCase()
  const filters = new Set()
  if (/\b(quick|fast|easy|\d{1,2}\s*-?\s*min)/.test(text)) filters.add('quick')
  if (/protein|gym|muscle/.test(text)) filters.add('high-protein')
  if (/kid|family|picky/.test(text)) filters.add('kid-approved')
  if (/batch|meal ?prep|leftover|freez/.test(text)) filters.add('big-batch')
  if (/vegetarian|veggie|meatless/.test(text)) filters.add('vegetarian')
  const m = text.match(/(?:under|below|less than|max|budget)\s*\$?\s*(\d{2,4})|\$\s*(\d{2,4})/)
  const budget = m ? Number(m[1] || m[2]) : null
  const dinners = text.match(/\b(\d)\s+(?:[a-z-]+\s+){0,3}(?:dinners|meals|nights)/)
  return { filters: [...filters], budget, meals: dinners ? Number(dinners[1]) : null }
}

// ---------- Costs ----------

// Typical regular prices when nothing is on sale, by aisle (per lb for weights, else per pack).
const FALLBACK_PRICE = {
  Produce: 2.5, 'Meat & Seafood': 7.5, 'Dairy & Eggs': 5, Bakery: 3.5, Frozen: 4.5,
  Pantry: 2.75, 'Plant Protein': 3.5, Other: 4,
}
const WEIGHT_UNITS = ['lb']

/**
 * Estimated cost of buying `qty` of an ingredient. Flyers rarely give package sizes,
 * so this is deliberately rough: per-weight deals scale by pounds, cheap per-item deals
 * (peppers at $0.99 ea) scale by count, everything else is one package.
 */
export function ingredientCost(ing, qty, deal) {
  const isWeight = WEIGHT_UNITS.includes(ing.unit)
  if (deal) {
    const perLb = PER_LB[deal.unit]
    let units = 1
    if (perLb && isWeight) units = qty
    else if (perLb) units = 1 // per-weight deal but recipe counts items: assume ~1 lb
    else if (ing.unit === 'each' && deal.price < 2.5) units = Math.ceil(qty)
    const unitPrice = perLb ? deal.price * perLb : deal.price
    const unitSavings = (deal.savings || 0) * (perLb || 1)
    return { cost: unitPrice * units, savings: unitSavings * units, onSale: true }
  }
  const base = FALLBACK_PRICE[ing.aisle] ?? 4
  return { cost: isWeight ? base * qty : base, savings: 0, onSale: false }
}

/** Swap an ingredient in a recipe for one of its alternatives. */
export function applySwaps(recipe, swaps = {}) {
  if (!Object.keys(swaps).length) return recipe
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ing) =>
      swaps[ing.item] ? { ...swaps[ing.item], qty: ing.qty, unit: swaps[ing.item].unit || ing.unit, swappedFrom: ing.item } : ing,
    ),
  }
}

/** Score + cost a recipe for this household against the active deals. */
export function evaluateRecipe(recipe, deals, prefs) {
  const factor = prefs.householdSize / recipe.servings
  let weight = 0
  let hit = 0
  let cost = 0
  let savings = 0
  const lines = []
  for (const ing of recipe.ingredients) {
    if (ing.pantry) continue
    const w = ing.main ? 3 : 1
    weight += w
    const deal = matchDeal(ing, deals)
    if (deal) hit += w
    const c = ingredientCost(ing, ing.qty * factor, deal)
    cost += c.cost
    savings += c.savings
    lines.push({ ing, deal, ...c })
  }
  const coverage = weight ? hit / weight : 0
  // Coverage dominates; savings break ties between similarly covered recipes.
  const score = coverage * 10 + Math.min(savings, 10) * 0.3
  const endsSoon = lines
    .map((l) => l.deal?.validTo)
    .filter(Boolean)
    .sort()[0]
  return {
    recipe,
    score,
    coverage,
    cost: Math.round(cost * 100) / 100,
    perServing: Math.round((cost / prefs.householdSize) * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    lines,
    endsSoon: endsSoon || null,
    // kept for older callers
    matches: Object.fromEntries(lines.filter((l) => l.deal).map((l) => [l.ing.item, l.deal])),
  }
}

/** Kept for tests and simple callers. */
export function scoreRecipe(recipe, deals) {
  const r = evaluateRecipe(recipe, deals, { householdSize: recipe.servings })
  return { score: r.score, matches: r.matches, savings: r.savings }
}

/**
 * Pick the week: no repeats, at most 2 dinners per protein, honour diet, chip filters,
 * an optional budget, pinned skips ("swap this meal") and per-recipe ingredient swaps.
 */
export function planWeek(recipes, deals, prefs, opts = {}) {
  const { filters = [], budget = null, skip = [], swaps = {} } = opts
  const tests = FILTERS.filter((f) => filters.includes(f.id)).map((f) => f.test)
  const scored = recipes
    .filter((r) => fitsDiet(r, prefs.diet || []))
    .filter((r) => tests.every((t) => t(r)))
    .filter((r) => !skip.includes(r.id))
    .map((r) => evaluateRecipe(applySwaps(r, swaps[r.id]), deals, prefs))
    .sort((a, b) => b.score - a.score)

  const meals = opts.meals || prefs.mealsPerWeek || 14
  const perProtein = {}
  const plan = []
  let spent = 0
  const fits = (s) => budget == null || spent + s.cost <= budget
  for (const s of scored) {
    if (plan.length >= meals) break
    const p = s.recipe.protein
    if ((perProtein[p] || 0) >= 2 || !fits(s)) continue
    perProtein[p] = (perProtein[p] || 0) + 1
    spent += s.cost
    plan.push(s)
  }
  // If variety rules left gaps, fill with the best remaining recipes that still fit.
  for (const s of scored) {
    if (plan.length >= meals) break
    if (!plan.includes(s) && fits(s)) {
      spent += s.cost
      plan.push(s)
    }
  }
  return plan
}

/** Alternatives for one ingredient with this week's best price, cheapest first. */
export function swapOptions(ing, alts, deals, prefs, factor) {
  const diet = prefs.diet || []
  return alts
    .filter((a) => !(a.notFor || []).some((t) => diet.includes(t)))
    .map((a) => {
      const alt = { ...a, unit: a.unit || ing.unit }
      const deal = matchDeal(alt, deals)
      return { alt, deal, ...ingredientCost(alt, ing.qty * factor, deal) }
    })
    .sort((x, y) => (y.onSale - x.onSale) || x.cost - y.cost)
}

// ---------- Shopping list ----------

// You can't buy half a head of broccoli: round countable units up, weights to the nearest 1/4.
const COUNT_UNITS = ['each', 'can', 'head', 'block', 'pack', 'bag', 'loaf', 'tub']
const round = (n, unit) => (COUNT_UNITS.includes(unit) ? Math.ceil(n - 0.01) : Math.round(n * 4) / 4 || 0.25)

function aggregate(plan, prefs) {
  const items = new Map()
  const pantry = new Set()
  for (const { recipe, batches = 1 } of plan) {
    const factor = (prefs.householdSize / recipe.servings) * batches
    for (const ing of recipe.ingredients) {
      if (ing.pantry) {
        pantry.add(ing.item)
        continue
      }
      const key = `${ing.item}|${ing.unit}`
      const row = items.get(key) || { ...ing, qty: 0, recipes: [] }
      row.qty += ing.qty * factor
      if (!row.recipes.includes(recipe.name)) row.recipes.push(recipe.name)
      items.set(key, row)
    }
  }
  return { rows: [...items.values()], pantry: [...pantry].sort() }
}

/** Store that covers the most list items (ties: bigger savings). */
export function bestSingleStore(rows, deals) {
  const stores = [...new Set(deals.map((d) => d.merchant).filter(Boolean))]
  let best = null
  for (const store of stores) {
    const storeDeals = deals.filter((d) => d.merchant === store)
    let covered = 0
    let savings = 0
    for (const row of rows) {
      const d = matchDeal(row, storeDeals)
      if (d) {
        covered += 1
        savings += ingredientCost(row, row.qty, d).savings
      }
    }
    if (!best || covered > best.covered || (covered === best.covered && savings > best.savings)) {
      best = { store, covered, savings }
    }
  }
  return best
}

/**
 * Up to `max` stores chosen greedily: each pick adds the most items not yet covered
 * (ties: more savings). Nine stores for nine items isn't a plan anyone will follow.
 */
export function bestStores(rows, deals, max = 3) {
  const stores = [...new Set(deals.map((d) => d.merchant).filter(Boolean))]
  const covered = new Set()
  const picked = []
  while (picked.length < max) {
    let best = null
    for (const store of stores) {
      if (picked.includes(store)) continue
      const storeDeals = deals.filter((d) => d.merchant === store)
      let gain = 0
      let savings = 0
      rows.forEach((row, idx) => {
        if (covered.has(idx)) return
        const d = matchDeal(row, storeDeals)
        if (d) {
          gain += 1
          savings += ingredientCost(row, row.qty, d).savings
        }
      })
      if (gain && (!best || gain > best.gain || (gain === best.gain && savings > best.savings))) best = { store, gain, savings }
    }
    if (!best) break
    picked.push(best.store)
    const storeDeals = deals.filter((d) => d.merchant === best.store)
    rows.forEach((row, idx) => matchDeal(row, storeDeals) && covered.add(idx))
  }
  return picked
}

/**
 * Aggregate the plan into a list. mode "split" buys each item wherever it's cheapest
 * among the best `maxStores` stores and groups by store; mode "single" sends everything to the one store that covers the
 * most items. Each group is sorted by aisle so it reads in store-walk order.
 */
export function buildShoppingList(plan, deals, prefs, { mode = 'split', maxStores = 3 } = {}) {
  const { rows: rawRows, pantry } = aggregate(plan, prefs)
  const single = mode === 'single' ? bestSingleStore(rawRows, deals) : null
  const allowed = single ? [single.store] : maxStores ? bestStores(rawRows, deals, maxStores) : null
  const pool = allowed ? deals.filter((d) => allowed.includes(d.merchant)) : deals

  // Two recipe lines that land on the same flyer item ("pasta" and "pasta or noodles")
  // become one list line.
  const merged = new Map()
  for (const row of rawRows) {
    const deal = matchDeal(row, pool)
    const key = deal ? `deal:${deal.dealId}|${row.unit}` : `${row.item}|${row.unit}`
    const prev = merged.get(key)
    if (prev) {
      prev.qty += row.qty
      prev.recipes = [...new Set([...prev.recipes, ...row.recipes])]
    } else merged.set(key, { ...row, recipes: [...row.recipes] })
  }
  const rows = [...merged.values()]

  let totalSavings = 0
  let totalCost = 0
  let onSale = 0
  const groups = {}
  const byAisle = {}
  for (const row of rows) {
    const deal = matchDeal(row, pool)
    const qty = round(row.qty, row.unit)
    const c = ingredientCost(row, row.qty, deal)
    totalSavings += c.savings
    totalCost += c.cost
    if (deal) onSale += 1
    const aisle = deal?.aisle || row.aisle || 'Other'
    const item = { ...row, qty, deal, aisle, cost: Math.round(c.cost * 100) / 100, savings: Math.round(c.savings * 100) / 100 }
    const store = single ? single.store : deal?.merchant || 'Any store'
    ;(groups[store] ||= []).push(item)
    ;(byAisle[aisle] ||= []).push(item)
  }
  const aisleOrder = (x, y) => AISLES.indexOf(x.aisle) - AISLES.indexOf(y.aisle) || x.item.localeCompare(y.item)
  const stores = Object.entries(groups)
    .map(([store, items]) => ({
      store,
      items: items.sort(aisleOrder),
      savings: Math.round(items.reduce((a, i) => a + i.savings, 0) * 100) / 100,
    }))
    // biggest haul first, the catch-all group last
    .sort((a, b) => (a.store === 'Any store') - (b.store === 'Any store') || b.items.length - a.items.length)

  return {
    mode,
    single,
    stores,
    aisles: AISLES.filter((a) => byAisle[a]).map((a) => ({ aisle: a, items: byAisle[a].sort(aisleOrder) })),
    pantry,
    totalSavings: Math.round(totalSavings * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    onSale,
    itemCount: rows.length,
  }
}

// ---------- Week schedule ----------

// Eat the most perishable proteins first: fish and poultry early, pantry meals late.
const FRESHNESS = { fish: 0, chicken: 1, poultry: 1, beef: 2, pork: 2, egg: 3, tofu: 4, cheese: 5, dairy: 5, legume: 6 }
const dayKey = (d) => d.toISOString().slice(0, 10)

/** The next 7 evenings starting today. */
export function weekDays(start = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12)
    return {
      key: dayKey(d),
      date: d,
      short: i === 0 ? 'Today' : d.toLocaleDateString('en-CA', { weekday: 'short' }),
      dayNum: d.getDate(),
    }
  })
}

/**
 * Lay meals out over the week.
 *  - nights marked off are skipped
 *  - big-batch meals cook double and cover the next open night as leftovers
 *  - by default, meals whose sale ends first and the most perishable proteins go first
 *  - `order` (recipe ids) lets the household move meals around; it wins over the default
 * `budget` caps the week's estimated spend. `candidates` come from planWeek, best first. Returns { days, meals } where meals are the
 * placed entries (with `batches` = 2 when they also feed a leftovers night).
 */
export function scheduleWeek(candidates, days, { off = [], order = [], leftovers = true, budget = null, maxMeals = null } = {}) {
  const open = days.filter((d) => !off.includes(d.key))
  // Phase 1: choose meals by score until the open nights are full.
  let slots = open.length
  const chosen = []
  let spent = 0
  for (const c of candidates) {
    if (slots <= 0 || (maxMeals != null && chosen.length >= maxMeals)) break
    const batch = leftovers && c.recipe.tags.includes('big-batch') && slots >= 2
    const cost = c.cost * (batch ? 2 : 1)
    if (budget != null && spent + cost > budget) continue
    spent += cost
    chosen.push({ ...c, batches: batch ? 2 : 1 })
    slots -= batch ? 2 : 1
  }
  // Phase 2: order them.
  const pos = (id) => {
    const i = order.indexOf(id)
    return i === -1 ? Infinity : i
  }
  chosen.sort(
    (a, b) =>
      pos(a.recipe.id) - pos(b.recipe.id) ||
      (a.endsSoon || '9999').localeCompare(b.endsSoon || '9999') ||
      (FRESHNESS[a.recipe.protein] ?? 9) - (FRESHNESS[b.recipe.protein] ?? 9),
  )
  // Phase 3: place.
  const byDay = {}
  let i = 0
  let pendingLeftovers = null
  for (const d of open) {
    if (pendingLeftovers) {
      byDay[d.key] = { type: 'leftovers', meal: pendingLeftovers }
      pendingLeftovers = null
    } else if (i < chosen.length) {
      const meal = chosen[i++]
      byDay[d.key] = { type: 'cook', meal }
      if (meal.batches === 2) pendingLeftovers = meal
    } else {
      byDay[d.key] = { type: 'open' }
    }
  }
  return {
    days: days.map((d) => ({ ...d, ...(off.includes(d.key) ? { type: 'off' } : byDay[d.key]) })),
    meals: chosen.slice(0, i),
  }
}
