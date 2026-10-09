// Protein-first planning: the week's biggest protein discounts ("hero deals"), a few dinners
// built around each one from the other things on sale, and a pool of 3–4 dinners (no days).
import { CATALOG } from '../data/ingredients'
import { TEMPLATES } from '../data/templates'
import { allowedByDiet, fillTemplate, matchDeal, PER_LB, slotCandidates } from './planner'
import { dislikedItems } from './likes'

const PROTEIN_GROUPS = ['poultry', 'pork', 'ground', 'fish', 'plantProtein', 'eggs']

const pctOff = (d) => (d.savings && d.price ? d.savings / (d.price + d.savings) : 0)
// Big discounts on big-ticket proteins first: $5/lb off chicken beats 44% off a can of beans.
const heroScore = (d) => pctOff(d) * 100 + Math.min((d.savings || 0) * (PER_LB[d.unit] ?? 1), 6) * 4

/** Every protein on sale this week, best deal first: [{ item, deal, pct, score }]. */
export function heroDeals(deals, prefs = {}) {
  const diet = prefs.diet || []
  const dislike = dislikedItems(prefs.likes)
  const seen = new Set()
  const out = []
  for (const group of PROTEIN_GROUPS) {
    for (const ing of CATALOG[group]) {
      if (dislike.has(ing.item) || !allowedByDiet(ing, diet)) continue
      const deal = matchDeal(ing, deals)
      if (!deal || seen.has(deal.dealId ?? deal.name)) continue
      if (!anchorMeals(ing.item, deals, prefs).length) continue
      seen.add(deal.dealId ?? deal.name)
      // Meat and fish lead (that's what most people plan dinner around), unless they don't eat it.
      const lead = ['plantProtein', 'eggs'].includes(group) ? -15 : 0
      out.push({ item: ing.item, group, deal, pct: pctOff(deal), score: heroScore(deal) + lead })
    }
  }
  return out.sort((a, b) => b.score - a.score)
}

const fillsOf = (m) => Object.fromEntries(m.lines.map((l) => [l.slot, l.ing.item]))

/**
 * Dinners built around one protein, best first: the rest of each dish leans on what's on sale.
 * Each is a filled recipe with `fills` and `anchor` set, ready to drop into the pool.
 */
export function anchorMeals(item, deals, prefs = {}) {
  const diet = prefs.diet || []
  const servings = prefs.householdSize || 2
  const dislike = dislikedItems(prefs.likes)
  const avoid = [...dislike].filter((i) => i !== item)
  const priced = new Map()
  const out = []
  for (const template of TEMPLATES) {
    if (template.meal !== 'dinner') continue
    const main = template.slots.find((s) => s.main)
    if (!main || !slotCandidates(main, deals, diet, priced).some((c) => c.ing.item === item)) continue
    const m = fillTemplate(template, { deals, diet, servings, priced, avoid, fills: { [main.key]: item } })
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
      const m = template && fillTemplate(template, { deals, diet, servings, priced, fills: p.fills || {} })
      if (!m) return null
      Object.assign(m, { key: `pool|${i}`, meal: 'dinner', day: null, fills: fillsOf(m), anchor: p.anchor, pick: i })
      if (p.leftovers) m.batches = 2
      return m
    })
    .filter(Boolean)
}

/** The pool as a plan, so the grocery list and everything else that reads a plan just works. */
export function poolPlan(meals) {
  return meals.map((m, i) => ({ key: m.key, short: `Dinner ${i + 1}`, dayNum: i + 1, date: null, meals: { dinner: m } }))
}

export const toPick = (m) => ({ template: m.template.id, fills: m.fills, anchor: m.anchor })
