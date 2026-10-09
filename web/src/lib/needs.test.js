import { describe, expect, it } from 'vitest'
import { activeDeals, buildShoppingList, cookedMeals, planWeek, weekDays } from './planner'
import { sampleDeals } from '../data/sampleDeals'
import { needDeal, needItems, parseNeeds, placeNeeds, searchDeals, suggestNeeds, wantedItems, withNeeds } from './needs'

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

describe('suggestions while typing', () => {
  it('offers the plain word, then flyer items, cheapest first', () => {
    const picks = suggestNeeds('cheese, milk', deals)
    expect(picks[0]).toEqual({ need: 'milk', deal: null })
    const flyer = picks.filter((p) => p.deal)
    expect(flyer.length).toBeGreaterThan(2)
    expect(flyer.every((p) => /milk/i.test(p.deal.name) || p.deal.queries.includes('milk'))).toBe(true)
    const named = flyer.filter((p) => /milk/i.test(p.deal.name)).map((p) => p.deal.price)
    expect(named).toEqual([...named].sort((a, b) => a - b))
    expect(flyer.at(-1).deal.name).toBe('Natrel 3.25%, 4 L') // says milk only in the flyer search
  })
  it('skips what is already on the list and short input', () => {
    expect(suggestNeeds('milk', deals, ['milk']).some((p) => p.need === 'milk')).toBe(false)
    expect(suggestNeeds('m', deals)).toEqual([])
  })
  it('a picked flyer item still steers meals and finds its deal', () => {
    const need = suggestNeeds('2% mil', deals).find((p) => p.deal).need
    expect(needItems(need)).toContain('milk')
    expect(needDeal(need, deals).name).toMatch(/2% Milk/)
  })
})

describe('grocery search', () => {
  const names = (term) => searchDeals(term, deals).map((d) => d.name)
  it('finds flyer items that only the flyer search called milk', () => {
    expect(names('milk')).toContain('Natrel 3.25%, 4 L')
  })
  it('understands homo, 3.25% and French names', () => {
    for (const t of ['homo milk', 'homo', '3.25%', 'homogenized', 'lait']) expect(names(t).join(' ')).toMatch(/Homogenized|3\.25%/)
    expect(names('homo milk')).not.toContain('Skim Milk, 2 L')
  })
  it('needs every word, in any order', () => {
    expect(names('milk chocolate')).toEqual(['Neilson Chocolate Milk, 1 L'])
    expect(names('2% milk')).toContain('2% Milk, 4 L')
  })
  it('handles plurals and partial words', () => {
    expect(names('egg').join()).toMatch(/Eggs/)
    expect(names('chees').join()).toMatch(/Cheddar/)
  })
  it('a typed need finds its flyer deal', () => {
    expect(needDeal('homo milk', deals).name).toMatch(/Homogenized|3\.25%/)
  })
})
