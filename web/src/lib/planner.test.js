import { describe, expect, it } from 'vitest'
import { activeDeals, applySwaps, buildShoppingList, matchDeal, parsePlanQuery, planWeek, scheduleWeek, swapOptions, weekDays } from './planner'
import { RECIPES, SWAPS } from '../data/recipes'
import { sampleDeals } from '../data/sampleDeals'

const deals = sampleDeals(new Date('2026-10-09T12:00:00Z'))
const today = new Date('2026-10-09T12:00:00Z')

describe('matchDeal', () => {
  it('ignores chicken soup and seasoning when looking for chicken breast', () => {
    const d = matchDeal({ item: 'chicken', match: ['chicken'], exclude: ['soup'] }, deals)
    expect(d.name).toMatch(/Thighs|Breast/)
  })
  it('never prices pantry staples', () => {
    expect(matchDeal({ item: 'salt', pantry: true, match: ['salt'] }, deals)).toBeNull()
  })
})

it('does not match chicken noodle soup for vegan noodles', () => {
  const d = matchDeal({ item: 'noodles', match: ['noodle'] }, deals)
  expect(d).toBeNull()
})

describe('activeDeals', () => {
  it('filters by store and expiry', () => {
    const only = activeDeals(deals, { stores: ['no frills'], today })
    expect(only.length).toBeGreaterThan(0)
    expect(only.every((d) => d.merchant === 'No Frills')).toBe(true)
    expect(activeDeals(deals, { today: new Date('2026-12-01') })).toHaveLength(0)
  })
})

describe('planWeek', () => {
  const prefs = { householdSize: 2, mealsPerWeek: 5, diet: [], stores: [] }
  it('returns the requested number of distinct meals', () => {
    const plan = planWeek(RECIPES, deals, prefs)
    expect(plan).toHaveLength(5)
    expect(new Set(plan.map((p) => p.recipe.id)).size).toBe(5)
  })
  it('respects dietary tags', () => {
    const plan = planWeek(RECIPES, deals, { ...prefs, diet: ['vegan'] })
    expect(plan.length).toBeGreaterThan(0)
    expect(plan.every((p) => p.recipe.tags.includes('vegan'))).toBe(true)
  })
  it('caps any one protein at two dinners', () => {
    const plan = planWeek(RECIPES, deals, { ...prefs, mealsPerWeek: 7 })
    const counts = {}
    plan.forEach((p) => (counts[p.recipe.protein] = (counts[p.recipe.protein] || 0) + 1))
    expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2)
  })
})

describe('buildShoppingList', () => {
  it('groups by aisle, scales by household and totals savings', () => {
    const prefs = { householdSize: 4, mealsPerWeek: 4, diet: [], stores: [] }
    const plan = planWeek(RECIPES, deals, prefs)
    const list = buildShoppingList(plan, deals, prefs)
    expect(list.aisles[0].aisle).toBe('Produce')
    expect(list.totalSavings).toBeGreaterThan(0)
    expect(list.pantry.length).toBeGreaterThan(0)
    const each = list.aisles.flatMap((a) => a.items).filter((x) => x.unit === 'each')
    expect(each.every((x) => Number.isInteger(x.qty))).toBe(true)
  })
})

describe('per-weight prices', () => {
  it('compares /100 g against /lb on the same scale', () => {
    const d = matchDeal({ item: 'chicken', match: ['chicken'] }, [
      { name: 'Chicken roast', price: 2.59, unit: '/100 g' },
      { name: 'Chicken breast', price: 4.99, unit: '/lb' },
    ])
    expect(d.name).toBe('Chicken breast')
  })
})

describe('parsePlanQuery', () => {
  it('reads filters, budget and meal count', () => {
    expect(parsePlanQuery('5 quick high protein dinners under $80')).toEqual({
      filters: ['quick', 'high-protein'],
      budget: 80,
      meals: 5,
    })
    expect(parsePlanQuery('meal prep for the kids').filters).toEqual(['kid-approved', 'big-batch'])
  })
})

describe('scheduleWeek', () => {
  const prefs = { householdSize: 4, diet: [], stores: [] }
  const days = weekDays(new Date('2026-10-09T12:00:00'))
  const candidates = planWeek(RECIPES, deals, prefs, { meals: 14 })

  it('fills open nights, skips nights off, and turns batch meals into leftovers', () => {
    const { days: out, meals } = scheduleWeek(candidates, days, { off: [days[2].key] })
    expect(out[2].type).toBe('off')
    expect(out.filter((d) => d.type === 'open')).toHaveLength(0)
    const cooks = out.filter((d) => d.type === 'cook').length
    const lefts = out.filter((d) => d.type === 'leftovers').length
    expect(cooks + lefts).toBe(6)
    expect(meals.filter((m) => m.batches === 2)).toHaveLength(lefts)
  })

  it('without leftovers, every open night is a new meal', () => {
    const { days: out } = scheduleWeek(candidates, days, { leftovers: false })
    expect(out.every((d) => d.type === 'cook')).toBe(true)
  })

  it('honours a custom order', () => {
    const { meals } = scheduleWeek(candidates, days, { leftovers: false })
    const order = meals.map((m) => m.recipe.id).reverse()
    const { days: out } = scheduleWeek(candidates, days, { leftovers: false, order })
    expect(out[0].meal.recipe.id).toBe(order[0])
  })

  it('respects a budget', () => {
    const { meals } = scheduleWeek(candidates, days, { leftovers: false, budget: 40 })
    expect(meals.reduce((a, m) => a + m.cost, 0)).toBeLessThanOrEqual(40)
  })
})

describe('swaps and list modes', () => {
  const prefs = { householdSize: 2, diet: [], stores: [] }
  it('applies an ingredient swap', () => {
    const r = RECIPES.find((x) => x.id === 'chicken-stir-fry')
    const swapped = applySwaps(r, { broccoli: SWAPS.broccoli.find((a) => a.item === 'green beans') })
    expect(swapped.ingredients.some((i) => i.item === 'green beans' && i.swappedFrom === 'broccoli')).toBe(true)
  })
  it('hides meat swaps from vegetarians', () => {
    const opts = swapOptions({ item: 'firm tofu', qty: 1, unit: 'block' }, SWAPS['firm tofu'], deals, { ...prefs, diet: ['vegetarian'] }, 1)
    expect(opts.every((o) => !o.alt.notFor)).toBe(true)
  })
  it('single-store mode puts everything at one store', () => {
    const plan = planWeek(RECIPES, deals, { ...prefs, mealsPerWeek: 4 })
    const list = buildShoppingList(plan, deals, prefs, { mode: 'single' })
    expect(list.stores).toHaveLength(1)
    expect(list.stores[0].store).toBe(list.single.store)
    expect(list.totalCost).toBeGreaterThan(0)
  })
})
