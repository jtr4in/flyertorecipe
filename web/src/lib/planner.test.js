import { describe, expect, it } from 'vitest'
import { activeDeals, buildShoppingList, cookedMeals, listSwapOptions, matchDeal, NUDGES, suggestMeals, parsePlanQuery, planWeek, swapOptions, weekDays } from './planner'
import { CATALOG } from '../data/ingredients'
import { sampleDeals } from '../data/sampleDeals'

const today = new Date('2026-10-09T12:00:00Z')
const deals = sampleDeals(today)
const days = weekDays(new Date('2026-10-09T12:00:00'))
const prefs = { householdSize: 2, diet: [], stores: [], meals: ['breakfast', 'lunch', 'dinner', 'snack'], lunchLeftovers: false }
const item = (group, name) => CATALOG[group].find((i) => i.item === name)
const deal = (name, extra = {}) => ({ name, merchant: 'Metro', price: 3, unit: '', priceLabel: '$3.00', ...extra })

describe('matchDeal', () => {
  it('ignores chicken soup when looking for noodles', () => {
    expect(matchDeal(item('starch', 'egg noodles'), [deal('Chicken Noodle Soup')])).toBeNull()
  })
  it('never prices pantry staples', () => {
    expect(matchDeal({ item: 'salt', pantry: true, match: ['salt'] }, deals)).toBeNull()
  })
  it('does not take ground pork for ground beef', () => {
    expect(matchDeal(item('ground', 'ground beef'), [deal('PORC HACHÉ MAIGRE | LEAN GROUND PORK')])).toBeNull()
  })
  it('does not take a carrot listing for mushrooms', () => {
    expect(matchDeal(item('cookingVeg', 'mushrooms'), [deal('Compliments Carrots or Onions 3 lb, or White Mushrooms 227 g')])).toBeNull()
  })
  it('prefers the headline product over one buried in a bundle', () => {
    const d = matchDeal(item('starch', 'potatoes'), [
      deal('SEEDLESS ORANGES, OR MINI WHITE OR YELLOW POTATOES', { price: 2 }),
      deal('Russet Potatoes 10 lb', { price: 4 }),
    ])
    expect(d.name).toMatch(/Russet/)
  })
  it('keeps chocolate chips out of potato chips', () => {
    expect(matchDeal(item('treats', 'chips'), [deal('Chipits Chocolate Chips 300 g')])).toBeNull()
    expect(matchDeal(item('treats', 'chocolate'), [deal('Chipits Chocolate Chips 300 g')])).not.toBeNull()
  })
  it('matches bun but not bunch', () => {
    expect(matchDeal(item('buns', 'buns'), [deal('Spinach bunch')])).toBeNull()
  })
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
  const plan = planWeek(deals, prefs, { days })

  it('plans breakfast, lunch, dinner and a snack for 7 days', () => {
    expect(plan).toHaveLength(7)
    for (const d of plan) expect(Object.keys(d.meals).sort()).toEqual(['breakfast', 'dinner', 'lunch', 'snack'])
  })
  it('builds meals mostly from flyer deals', () => {
    const lines = cookedMeals(plan).flatMap((m) => m.lines)
    expect(lines.filter((l) => l.onSale).length / lines.length).toBeGreaterThan(0.8)
  })
  it('rarely repeats a dinner', () => {
    const ids = plan.map((d) => d.meals.dinner.template.id)
    expect(new Set(ids).size).toBeGreaterThanOrEqual(5)
  })
  it('respects vegan', () => {
    const vegan = planWeek(deals, { ...prefs, diet: ['vegan'] }, { days })
    const has = cookedMeals(vegan).flatMap((m) => m.lines.flatMap((l) => l.ing.has))
    expect(has.filter((h) => ['meat', 'fish', 'dairy', 'egg'].includes(h))).toEqual([])
  })
  it('only plans the meals asked for', () => {
    const p = planWeek(deals, { ...prefs, meals: ['dinner'] }, { days })
    expect(Object.keys(p[0].meals)).toEqual(['dinner'])
  })
  it('turns last night\'s dinner into lunch and cooks it double', () => {
    const p = planWeek(deals, { ...prefs, lunchLeftovers: true }, { days })
    expect(p[0].meals.lunch.lines).toBeTruthy() // nothing cooked the night before today
    expect(p[1].meals.lunch.leftovers).toBe(p[0].meals.dinner)
    expect(p[0].meals.dinner.batches).toBe(2)
  })
  it('applies skip, another idea and ingredient swaps', () => {
    const dinner = plan[2].meals.dinner
    const key = dinner.key
    const swapLine = dinner.lines.find((l) => l.main) || dinner.lines[0]
    const alt = swapOptions(dinner, swapLine, deals, prefs).find((c) => c.ing.item !== swapLine.ing.item)
    const p = planWeek(deals, prefs, {
      days,
      overrides: {
        [`${days[0].key}|snack`]: { skip: true },
        [`${days[1].key}|dinner`]: { exclude: [plan[1].meals.dinner.template.id] },
        [key]: { template: dinner.template.id, fills: { [swapLine.slot]: alt.ing.item } },
      },
    })
    expect(p[0].meals.snack.skipped).toBe(true)
    expect(p[1].meals.dinner.template.id).not.toBe(plan[1].meals.dinner.template.id)
    expect(p[2].meals.dinner.lines.find((l) => l.slot === swapLine.slot).ing.item).toBe(alt.ing.item)
  })
  it('keeps meals within a tight budget where it can', () => {
    const cheap = planWeek(deals, prefs, { days, budget: 60 })
    const cost = (pl) => cookedMeals(pl).reduce((a, m) => a + m.cost, 0)
    expect(cost(cheap)).toBeLessThanOrEqual(cost(plan))
  })
})

describe('buildShoppingList', () => {
  const plan = planWeek(deals, prefs, { days })
  it('price matching uses the cheapest flyer from any store and lists every flyer', () => {
    const list = buildShoppingList(plan, deals, prefs, { mode: 'match' })
    expect(list.itemCount).toBeGreaterThan(5)
    expect(list.flyers.length).toBe(list.onSale)
    expect(list.matchStores.length).toBeGreaterThan(1)
    expect(list.totalSavings).toBeGreaterThan(0)
  })
  it('one store only uses that store\'s deals', () => {
    const list = buildShoppingList(plan, deals, { ...prefs, homeStore: 'Metro' }, { mode: 'single' })
    expect(list.store).toBe('Metro')
    const used = list.groups.flatMap((g) => g.items).filter((i) => i.deal)
    expect(used.every((i) => i.deal.merchant === 'Metro')).toBe(true)
  })
})

it('ignores a home store that is no longer in the planned stores', () => {
  const plan = planWeek(deals, prefs, { days })
  const fewer = deals.filter((d) => d.merchant !== 'Metro')
  const list = buildShoppingList(plan, fewer, { ...prefs, homeStore: 'Metro' }, { mode: 'single' })
  expect(list.store).not.toBe('Metro')
  expect(list.onSale).toBeGreaterThan(0)
})

it('swaps a grocery item in every meal that uses it', () => {
  const plan = planWeek(deals, prefs, { days })
  const list = buildShoppingList(plan, deals, prefs)
  const item = list.groups.flatMap((g) => g.items).find((i) => i.uses.length > 1 && listSwapOptions(i.uses, deals, prefs).length > 1)
  const alt = listSwapOptions(item.uses, deals, prefs).find((c) => c.ing.item !== item.item)
  const overrides = {}
  for (const { meal, line } of alt.fits) overrides[meal.key] = { template: meal.template.id, fills: { [line.slot]: alt.ing.item } }
  const after = buildShoppingList(planWeek(deals, prefs, { days, overrides, avoid: [item.item] }), deals, prefs)
  const left = after.groups.flatMap((g) => g.items).find((i) => i.item === item.item)
  expect(left?.uses.length || 0).toBeLessThan(item.uses.length)
})

describe('suggestMeals', () => {
  const plan = planWeek(deals, prefs, { days })
  const snack = plan[0].meals.snack
  it('offers several other ideas, never the current one', () => {
    const ideas = suggestMeals(snack, deals, prefs, { plan })
    expect(ideas.length).toBeGreaterThanOrEqual(6)
    expect(ideas.map((m) => m.name)).not.toContain(snack.name)
    expect(ideas.every((m) => m.fills)).toBe(true)
  })
  it('narrows by nudge', () => {
    const sweet = suggestMeals(snack, deals, prefs, { plan, nudge: 'sweet' })
    expect(sweet.length).toBeGreaterThan(0)
    expect(sweet.every((m) => NUDGES.sweet.test(m))).toBe(true)
  })
  it('locks in a picked idea', () => {
    const idea = suggestMeals(snack, deals, prefs, { plan })[1]
    const p = planWeek(deals, prefs, { days, overrides: { [snack.key]: { template: idea.template.id, fills: idea.fills } } })
    expect(p[0].meals.snack.name).toBe(idea.name)
  })
})

describe('parsePlanQuery', () => {
  it('reads filters and a budget', () => {
    expect(parsePlanQuery('quick high protein meals under $150')).toEqual({ filters: ['quick', 'high-protein'], budget: 150 })
  })
  it('reads a request for treats', () => {
    expect(parsePlanQuery('some fun snacks this week').filters).toEqual(['treats'])
  })
})

describe('treats', () => {
  const snacks = (plan) => plan.map((d) => d.meals.snack).filter((m) => m?.lines)
  it('the Treats filter fills snacks with fun food from the flyers', () => {
    const plain = snacks(planWeek(deals, prefs, { days })).filter((m) => m.template.vibes.includes('treat'))
    const fun = snacks(planWeek(deals, prefs, { days, filters: ['treats'] })).filter((m) => m.template.vibes.includes('treat'))
    expect(fun.length).toBeGreaterThan(plain.length)
    expect(fun.length).toBeGreaterThanOrEqual(4)
  })
  it('Another idea can ask for a treat', () => {
    const plan = planWeek(deals, prefs, { days })
    const ideas = suggestMeals(plan[0].meals.snack, deals, prefs, { nudge: 'treat', plan })
    expect(ideas.length).toBeGreaterThan(0)
    expect(ideas.every((m) => m.template.vibes.includes('treat'))).toBe(true)
  })
})

describe('pantry', () => {
  it('splits staples from items to check, grouped by aisle', () => {
    const list = buildShoppingList(planWeek(deals, prefs, { days }), deals, prefs)
    const check = list.pantryCheck.flatMap((g) => g.items.map((p) => p.item.toLowerCase()))
    expect(list.pantry).toContain('salt')
    expect(check).not.toContain('salt')
    expect(list.pantryCheck.every((g) => g.items.length > 0)).toBe(true)
    expect(list.pantryCheck.flatMap((g) => g.items).every((p) => p.meals.length > 0)).toBe(true)
  })
})
