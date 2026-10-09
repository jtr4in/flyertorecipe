import { describe, expect, it } from 'vitest'
import { activeDeals, buildShoppingList, cookedMeals, planWeek, weekDays } from './planner'
import { sampleDeals } from '../data/sampleDeals'
import { needItems, parseNeeds, placeNeeds, wantedItems, withNeeds } from './needs'

const today = new Date('2026-10-09T12:00:00Z')
const deals = activeDeals(sampleDeals(today), { today })
const days = weekDays(new Date('2026-10-09T12:00:00'))
const prefs = { householdSize: 2, diet: [], stores: [], meals: ['breakfast', 'lunch', 'dinner', 'snack'], lunchLeftovers: false }
const uses = (plan, item) => cookedMeals(plan).filter((m) => m.lines.some((l) => l.ing.item === item)).length

describe('what we need', () => {
  it('splits a typed list', () => {
    expect(parseNeeds('Salami, cheese\ncereal, cheese')).toEqual(['salami', 'cheese', 'cereal'])
  })
  it('maps everyday words to recipe ingredients', () => {
    expect(needItems('cheese')).toContain('cheddar')
    expect(needItems('salami')).toEqual([])
    expect(needItems('pork').length).toBeGreaterThan(0)
  })
  it('steers the week toward what we need', () => {
    const want = wantedItems(['chickpeas', 'broccoli'])
    const base = planWeek(deals, prefs, { days })
    const steered = planWeek(deals, prefs, { days, want })
    const count = (p) => [...want].reduce((a, i) => a + uses(p, i), 0)
    expect(count(steered)).toBeGreaterThan(0)
    expect(count(steered)).toBeGreaterThan(count(base))
  })
  it('puts needs the meals do not use on the list', () => {
    const plan = planWeek(deals, prefs, { days })
    const list = buildShoppingList(plan, deals, prefs)
    const { status, group } = placeNeeds(['salami', 'cereal'], list, deals)
    expect(group.title).toBe('From your list')
    expect(group.items.map((i) => i.item)).toEqual(['salami', 'cereal'])
    expect(status.find((s) => s.need === 'cereal').deal?.name).toMatch(/cheerios|cereal/i)
    const full = withNeeds(list, group)
    expect(full.groups[0]).toBe(group)
    expect(full.itemCount).toBe(list.itemCount + 2)
  })
})
