// Protein-first planning: the week's biggest protein discounts ("hero deals"), a few dinners
// built around each one from the other things on sale, and a pool of 3–4 dinners (no days).
import { CATALOG } from '../data/ingredients'
import { TEMPLATES } from '../data/templates'
import { allowedByDiet, fillTemplate, matchAll, PER_LB, slotCandidates, withJar } from './planner'
import { dislikedItems } from './likes'

const MAX_PER_ITEM = 8 // deals shown per protein (chicken breasts at up to 8 stores)

// What each meal is planned around: [section id, emoji, label, catalog items]. Dinner is the
// protein; breakfast and lunch are their own staples (cereal, yogurt, deli meat, wraps...).
export const SECTIONS = {
  dinner: [
    ['poultry', '🐔', 'Chicken & turkey', CATALOG.poultry.map((i) => i.item)],
    ['pork', '🐖', 'Pork', CATALOG.pork.map((i) => i.item)],
    ['ground', '🍔', 'Ground meat', CATALOG.ground.map((i) => i.item)],
    ['fish', '🐟', 'Fish & seafood', CATALOG.fish.map((i) => i.item)],
    ['plantProtein', '🌱', 'Beans, lentils & tofu', CATALOG.plantProtein.map((i) => i.item)],
    ['eggs', '🥚', 'Eggs', ['eggs']],
  ],
  breakfast: [
    ['cereal', '🥣', 'Cereal & oats', ['cereal', 'oats', 'granola']],
    ['yogurt', '🍦', 'Yogurt', ['yogurt']],
    ['eggs', '🥚', 'Eggs', ['eggs']],
    ['meat', '🥓', 'Bacon & sausage', ['bacon', 'sausages']],
    ['bread', '🍞', 'Bread & bagels', ['bread', 'bagels', 'English muffins']],
    ['fruit', '🍓', 'Fruit', ['strawberries', 'blueberries', 'bananas', 'apples', 'oranges', 'grapes', 'pears', 'frozen fruit']],
  ],
  lunch: [
    ['deli', '🥪', 'Sandwich meat', ['deli turkey or ham', 'rotisserie chicken', 'canned tuna', 'bacon']],
    ['bread', '🌯', 'Bread, wraps & buns', ['bread', 'tortillas', 'pitas', 'buns', 'bagels']],
    ['cheese', '🧀', 'Cheese', ['cheddar', 'mozzarella', 'feta']],
    ['salad', '🥗', 'Salad', ['lettuce', 'salad greens', 'spinach', 'tomatoes', 'cucumber']],
    ['dips', '🫘', 'Hummus & beans', ['hummus', 'chickpeas', 'black beans']],
    ['eggs', '🥚', 'Eggs', ['eggs']],
  ],
}
const ingredient = (item) => Object.values(CATALOG).flat().find((i) => i.item === item)
const groupsOf = (item) => Object.keys(CATALOG).filter((g) => CATALOG[g].some((i) => i.item === item))

const pctOff = (d) => (d.savings && d.price ? d.savings / (d.price + d.savings) : 0)
// Big discounts on big-ticket proteins first: $5/lb off chicken beats 44% off a can of beans.
const heroScore = (d) => pctOff(d) * 100 + Math.min((d.savings || 0) * (PER_LB[d.unit] ?? 1), 6) * 4

/** Every deal on what the meal is planned around (dinner: proteins), best first:
 * [{ item, group, label, emoji, deal, pct, score }]. Several deals can share one item
 * (chicken breasts at three stores); each one can anchor meals. */
export function heroDeals(deals, prefs = {}, meal = 'dinner') {
  const diet = prefs.diet || []
  const dislike = dislikedItems(prefs.likes)
  const seen = new Set()
  const out = []
  for (const [group, emoji, label, items] of SECTIONS[meal]) {
    for (const item of items) {
      const ing = ingredient(item)
      if (!ing || dislike.has(item) || !allowedByDiet(ing, diet)) continue
      const found = matchAll(ing, deals).filter((d) => !seen.has(d.dealId ?? d.name))
      if (!found.length || !anchorMeals(item, deals, prefs, null, meal).length) continue
      // Meat and fish lead dinner (that's what most people plan it around), unless they don't eat it.
      const low = meal === 'dinner' && ['plantProtein', 'eggs'].includes(group)
      for (const deal of found.slice(0, MAX_PER_ITEM)) {
        seen.add(deal.dealId ?? deal.name)
        out.push({ item, group, label, emoji, deal, low, pct: pctOff(deal), score: heroScore(deal) })
      }
    }
  }
  // At dinner meat and fish always come first: most flyers give no regular price for meat, so a
  // 39%-off bag of lentils would otherwise outrank every chicken deal.
  return out.sort((a, b) => plant(a) - plant(b) || b.score - a.score || perLb(a) - perLb(b))
}

// Ties (no regular price on the flyer) go to the cheaper protein per lb.
const perLb = (h) => h.deal.price * (PER_LB[h.deal.unit] ?? 1)

const plant = (h) => (h.low ? 1 : 0)

const fillsOf = (m) => Object.fromEntries(m.lines.map((l) => [l.slot, l.ing.item]))

/**
 * Dinners built around one protein, best first: the rest of each dish leans on what's on sale.
 * Each is a filled recipe with `fills` and `anchor` set, ready to drop into the pool.
 */
export function anchorMeals(item, deals, prefs = {}, deal = null, meal = 'dinner') {
  const diet = prefs.diet || []
  const servings = prefs.householdSize || 2
  const dislike = dislikedItems(prefs.likes)
  const avoid = [...dislike].filter((i) => i !== item)
  const priced = new Map()
  // The deal the household tapped stands in for the item's cheapest one.
  if (deal) for (const g of groupsOf(item)) priced.set(`${g}:${item}`, deal)
  const out = []
  for (const template of TEMPLATES) {
    if (template.meal !== meal) continue
    // Dinner is built around its main (the protein); breakfast and lunch around any slot that
    // can take the item (yogurt in a parfait, ham in a sandwich).
    const fits = (s) => slotCandidates(s, deals, diet, priced).some((c) => c.ing.item === item)
    const slot = meal === 'dinner' ? template.slots.find((s) => s.main && fits(s)) : template.slots.find(fits)
    if (!slot) continue
    const m = fillTemplate(template, { deals, diet, servings, priced, avoid, fills: { [slot.key]: item } })
    if (!m || !m.lines.some((l) => l.ing.item === item)) continue
    m.fills = fillsOf(m)
    m.anchor = item
    const share = m.lines.length ? m.onSale / m.lines.length : 0
    m.rank = share * 100 + Math.min(m.savings, 10) - m.lines.filter((l) => dislike.has(l.ing.item)).length * 200
    out.push(m)
  }
  return out.sort((a, b) => b.rank - a.rank)
}

/** A quick dinner (20 minutes or less) around the protein, when one exists. */
export const quickMeal = (meals) => meals.find((m) => m.minutes <= 20) || null

/** The pool's saved picks ({ template, fills, anchor }) re-made with this week's deals. */
export function poolMeals(picks = [], deals, prefs = {}) {
  const diet = prefs.diet || []
  const servings = prefs.householdSize || 2
  const priced = new Map()
  return picks
    .map((p, i) => {
      const template = TEMPLATES.find((t) => t.id === p.template)
      const filled = template && fillTemplate(template, { deals, diet, servings, priced, fills: p.fills || {} })
      if (!filled) return null
      const fills = fillsOf(filled)
      const m = p.jar ? withJar(filled, deals) : filled
      Object.assign(m, { key: `pool|${i}`, meal: template.meal, day: null, fills, anchor: p.anchor, pick: i })
      if (p.leftovers) m.batches = 2
      return m
    })
    .filter(Boolean)
}

/** The pool as a plan, so the grocery list and everything else that reads a plan just works. */
export function poolPlan(meals) {
  return meals.map((m, i) => ({ key: m.key, short: `Meal ${i + 1}`, dayNum: i + 1, date: null, meals: { [m.meal]: m } }))
}

export const toPick = (m) => ({ template: m.template.id, fills: m.fills, anchor: m.anchor })

// ---------- Filters and breakfast / lunch picks ----------

/** Recipe filters: [id, label, test(template)]. Several chosen means a recipe must match all. */
export const FILTERS = [
  ['quick', '⚡ Quick', (t) => t.tags?.includes('quick') || t.minutes <= 20],
  ['healthy', '🥗 Healthy', (t) => t.vibes?.some((v) => v === 'healthy' || v === 'light')],
  ['comfort', '🍲 Comfort', (t) => t.vibes?.includes('comfort')],
  ['fun', '🎉 Fun', (t) => t.vibes?.some((v) => v === 'treat' || v === 'sweet')],
  ['kids', '🧒 Kid-friendly', (t) => t.tags?.includes('kid-approved')],
  ['batch', '📦 Big batch', (t) => t.tags?.includes('big-batch')],
]

export const passesFilters = (template, filters = []) =>
  filters.every((id) => FILTERS.find((f) => f[0] === id)?.[2](template) ?? true)

/** How many of a meal's ingredients are already on the grocery list. */
export const sharedCount = (meal, have) => meal.lines.filter((l) => have.has(l.ing.item)).length

/**
 * Breakfasts or lunches for the week, best first: ones that reuse what's already on the list
 * (`have`), then the most on sale. Each is a filled recipe ready to add to the pool.
 */
export function mealOptions(meal, deals, prefs = {}, { have = new Set(), filters = [] } = {}) {
  const diet = prefs.diet || []
  const servings = prefs.householdSize || 2
  const avoid = [...dislikedItems(prefs.likes)]
  const priced = new Map()
  const usage = Object.fromEntries([...have].map((i) => [i, 1]))
  const out = []
  for (const template of TEMPLATES) {
    if (template.meal !== meal || !passesFilters(template, filters)) continue
    const m = fillTemplate(template, { deals, diet, servings, priced, avoid, usage })
    if (!m) continue
    m.fills = fillsOf(m)
    m.shared = sharedCount(m, have)
    m.rank = m.shared * 15 + (m.lines.length ? (m.onSale / m.lines.length) * 100 : 0) + Math.min(m.savings, 10)
    out.push(m)
  }
  return out.sort((a, b) => b.rank - a.rank)
}
