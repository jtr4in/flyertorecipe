import { describe, expect, it } from 'vitest'
import { activeDeals, buildShoppingList, matchDeal, planWeek } from './planner'
import { RECIPES } from '../data/recipes'
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
