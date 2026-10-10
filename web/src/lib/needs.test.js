import { describe, expect, it } from 'vitest'
import { activeDeals, buildShoppingList, cookedMeals, planWeek, weekDays } from './planner'
import { sampleDeals } from '../data/sampleDeals'
import { needDeal, needItems, pantryDeal, withoutItems, parseNeeds, placeNeeds, searchDeals, suggestNeeds, wantedItems, withNeeds } from './needs'

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
    // Plain milk first (chocolate or oat milk after), each cheapest first.
    const named = flyer.filter((p) => /milk/i.test(p.deal.name) && !/chocolate|oat|almond|soy|lactose/i.test(p.deal.name)).map((p) => p.deal.price)
    expect(named).toEqual([...named].sort((a, b) => a - b))
    expect(flyer.at(-1).deal.name).toBe('Natrel 3.25%, 4 L') // says milk only in the flyer search
  })
  it('skips what is already on the list and short input', () => {
    expect(suggestNeeds('milk', deals, ['milk']).some((p) => p.need === 'milk')).toBe(false)
    expect(suggestNeeds('m', deals)).toEqual([])
  })
  it('offers what was typed when it is not a catalog word, and plain matches before varieties', () => {
    const d = (dealId, name, price) => ({ dealId, name, price, merchant: 'Metro', queries: [] })
    const shelf = [d('a', 'Silex Coffee Creamer 473 mL', 3), d('b', 'Nabob Coffee 900 g', 9), d('c', 'Long Eggplant', 2), d('e', 'Large Eggs, 12', 4)]
    const picks = suggestNeeds('coffee', shelf)
    expect(picks[0]).toEqual({ need: 'coffee', deal: null })
    expect(picks[1].deal.dealId).toBe('b')
    expect(needDeal('coffee', shelf).dealId).toBe('b')
    expect(needDeal('eggs', shelf).dealId).toBe('e')
    expect(needDeal('egg', shelf).dealId).toBe('e')
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
  it('a plain need skips varieties unless they were typed', () => {
    const shelf = [
      { name: 'Neilson Chocolate Milk, 1 L', price: 2.99, merchant: 'No Frills' },
      { name: 'Natrel 2% Milk, 4 L', price: 6.49, merchant: 'Metro' },
    ]
    expect(needDeal('milk', shelf).name).toMatch(/Natrel/)
    expect(needDeal('chocolate milk', shelf).name).toMatch(/Neilson/)
    const quebec = [
      { name: 'LAIT ÉVAPORÉ SANS NOM, 354 mL', price: 1.33 },
      { name: 'REHAUSSEUR OU CRÉMEUR À CAFÉ COFFEE MATE', price: 2.49 },
      { name: 'CRÈME À CAFÉ 10 % 1 L', price: 3.0 },
      { name: 'Nuti milk Nutimilk cream, 380 g', price: 1.49 },
      { name: 'Lait 2 %, 4 L', price: 5.99 },
      { name: 'Maxwell House Coffee, 920 g', price: 9.99 },
    ]
    expect(needDeal('milk', quebec.map((d) => ({ ...d, name: d.name.replace('Lait 2', 'Milk 2') }))).name).toMatch(/Milk 2/)
    expect(needDeal('coffee', quebec).name).toMatch(/Maxwell/)
  })
})

describe('savings on deals that print no regular price', () => {
  const milk = (extra = {}) => ({ dealId: 'm1', name: 'Natrel milk 4 L', merchant: 'Metro', price: 7.7, ...extra })
  it('assumes about 23% off', () => {
    const { group } = placeNeeds(['milk'], null, [milk()])
    expect(group.items[0].savings).toBeCloseTo(2.3, 2)
    expect(group.items[0].estimated).toBe(true)
  })
  it('uses the flyer saving when it has one', () => {
    const { group } = placeNeeds(['milk'], null, [milk({ savings: 1 })])
    expect(group.items[0].savings).toBe(1)
    expect(group.items[0].estimated).toBe(false)
  })
  it('honours a deal picked from other options', () => {
    const deals = [milk(), milk({ dealId: 'm2', price: 5 })]
    const { group } = placeNeeds(['milk'], null, deals, { 'need:milk': 'm2' })
    expect(group.items[0].deal.dealId).toBe('m2')
  })
})

describe('pantry deals', () => {
  const deals = [
    { dealId: 'a', name: 'Sesame seed bagels', price: 3 },
    { dealId: 'b', name: 'Gay Lea sour cream 500 mL', price: 2.49 },
    { dealId: 'c', name: 'Campbell chicken broth 900 mL', price: 1.99 },
    { dealId: 'd', name: 'Beef bologna', price: 1.5, queries: ['beef broth'] },
  ]
  it('needs every word in the deal name', () => {
    expect(pantryDeal('sour cream', deals).dealId).toBe('b')
    expect(pantryDeal('sesame seeds', deals)).toBe(null)
  })
  it('reads "beef or chicken broth" as two broths', () => {
    expect(pantryDeal('beef or chicken broth', deals).dealId).toBe('c')
  })
})

describe('pantry deals match whole words', () => {
  it('does not read dill in Dillon’s', () => {
    const deals = [{ dealId: 'g', name: "Dillon's gin cocktails 12 x 355 mL", price: 27 }, { dealId: 'h', name: 'Fresh dill bunch', price: 1.5 }]
    expect(pantryDeal('dill', deals).dealId).toBe('h')
    expect(pantryDeal('dill', deals.slice(0, 1))).toBe(null)
  })
})

describe('taking items off the list', () => {
  it('drops the item and its cost from the totals', () => {
    const list = buildShoppingList(planWeek(deals, prefs, { days }), deals, prefs)
    const first = list.groups[0].items[0]
    const out = withoutItems(list, [first.key])
    expect(out.itemCount).toBe(list.itemCount - 1)
    expect(out.groups.flatMap((g) => g.items).some((i) => i.key === first.key)).toBe(false)
    expect(out.totalCost).toBeCloseTo(list.totalCost - first.cost, 2)
  })
})

describe('French flyer words', () => {
  it('reads lait as milk but not laitue', () => {
    const deals = [{ dealId: 'l', name: 'Laitue romaine | Romaine lettuce', price: 1.77 }, { dealId: 'm', name: 'Lait 2 % Québon 4 L', price: 5.99 }]
    expect(searchDeals('milk', deals).map((d) => d.dealId)).toEqual(['m'])
  })
})
