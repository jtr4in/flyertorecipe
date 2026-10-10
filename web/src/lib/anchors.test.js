import { describe, expect, it } from 'vitest'
import { activeDeals, buildShoppingList } from './planner'
import { sampleDeals } from '../data/sampleDeals'
import { anchorMeals, FILTERS, heroDeals, mealOptions, passesFilters, poolMeals, poolPlan, quickMeal, toPick } from './anchors'

const today = new Date('2026-10-09T12:00:00Z')
const deals = activeDeals(sampleDeals(today), { today })
const prefs = { householdSize: 2, diet: [], stores: [] }

describe('protein-first planning', () => {
  it('lists proteins on sale, best deal first, big-ticket meat ahead of canned beans', () => {
    const heroes = heroDeals(deals, prefs)
    expect(heroes.length).toBeGreaterThan(3)
    const plant = (h) => ['plantProtein', 'eggs'].includes(h.group)
    const meat = heroes.filter((h) => !plant(h))
    expect(heroes.slice(0, meat.length)).toEqual(meat)
    expect(meat.map((h) => h.score)).toEqual([...meat.map((h) => h.score)].sort((a, b) => b - a))
    expect(heroes.slice(0, 3).some(plant)).toBe(false)
    expect(heroes.every((h) => h.deal)).toBe(true)
  })
  it('respects diet and dislikes', () => {
    expect(heroDeals(deals, { ...prefs, diet: ['vegetarian'] }).some((h) => ['poultry', 'pork', 'ground', 'fish'].includes(h.group) && h.item !== 'firm tofu' && !['chickpeas', 'black beans', 'lentils'].includes(h.item))).toBe(false)
    expect(heroDeals(deals, { ...prefs, likes: { protein: ['chicken'] } }).some((h) => h.item === 'ground beef')).toBe(false)
  })
  it('builds several dinners around each protein', () => {
    const top = heroDeals(deals, prefs)[0]
    const meals = anchorMeals(top.item, deals, prefs)
    expect(meals.length).toBeGreaterThanOrEqual(2)
    expect(meals.every((m) => m.lines.some((l) => l.ing.item === top.item))).toBe(true)
    expect(new Set(meals.map((m) => m.template.id)).size).toBe(meals.length)
  })
  it('offers a quick option when there is one', () => {
    const q = quickMeal(anchorMeals('ground beef', deals, prefs))
    expect(q === null || q.minutes <= 20).toBe(true)
  })
  it('turns the pool into a grocery list', () => {
    const picks = ['chicken thighs', 'ground beef', 'shrimp'].map((i) => toPick(anchorMeals(i, deals, prefs)[0]))
    const meals = poolMeals(picks, deals, prefs)
    expect(meals.map((m) => m.anchor)).toEqual(['chicken thighs', 'ground beef', 'shrimp'])
    const list = buildShoppingList(poolPlan(meals), deals, prefs)
    const items = list.groups.flatMap((g) => g.items.map((i) => i.key))
    for (const i of ['chicken thighs', 'ground beef', 'shrimp']) expect(items).toContain(i)
  })
})

describe('several deals per protein', () => {
  const shelf = [
    ...deals,
    { dealId: 'a', name: 'Boneless Chicken Breast', price: 3.99, unit: '/lb', merchant: 'Metro' },
    { dealId: 'b', name: 'Poitrines de poulet désossées', price: 4.49, unit: '/lb', merchant: 'Maxi' },
  ]
  it('lists every store with the protein, French names included', () => {
    const breasts = heroDeals(shelf, prefs).filter((h) => h.item === 'chicken breasts').map((h) => h.deal.dealId)
    expect(breasts).toEqual(expect.arrayContaining(['a', 'b']))
  })
  it("plans dinners with the deal that was tapped", () => {
    const tapped = shelf.find((d) => d.dealId === 'b')
    const meal = anchorMeals('chicken breasts', shelf, prefs, tapped)[0]
    expect(meal.lines.find((l) => l.ing.item === 'chicken breasts').deal.dealId).toBe('b')
  })
})

describe('breakfasts, lunches and filters', () => {
  it('offers breakfasts and lunches, reusing what is already on the list first', () => {
    const plain = mealOptions('breakfast', deals, prefs)
    expect(plain.length).toBeGreaterThan(3)
    expect(plain.every((m) => m.template.meal === 'breakfast')).toBe(true)
    const have = new Set([plain.at(-1).lines[0].ing.item])
    const withList = mealOptions('breakfast', deals, prefs, { have })
    expect(withList[0].shared).toBeGreaterThan(0)
  })
  it('filters narrow the choices', () => {
    const quick = mealOptions('lunch', deals, prefs, { filters: ['quick'] })
    expect(quick.length).toBeGreaterThan(0)
    expect(quick.every((m) => passesFilters(m.template, ['quick']))).toBe(true)
    expect(FILTERS.map((f) => f[0])).toEqual(expect.arrayContaining(['quick', 'healthy', 'fun']))
  })
  it('keeps each pick as its own meal type on the list', () => {
    const b = mealOptions('breakfast', deals, prefs)[0]
    const [m] = poolMeals([toPick(b)], deals, prefs)
    expect(m.meal).toBe('breakfast')
    expect(buildShoppingList(poolPlan([m]), deals, prefs).itemCount).toBeGreaterThan(0)
  })
})

describe('other options for a list item', () => {
  it('uses the deal the household picked instead of the cheapest', () => {
    const b = mealOptions('breakfast', deals, prefs)[0]
    const plan = poolPlan(poolMeals([toPick(b)], deals, prefs))
    const item = buildShoppingList(plan, deals, prefs).groups.flatMap((g) => g.items).find((i) => i.deal)
    const other = deals.find((d) => d.dealId !== item.deal.dealId)
    const picked = buildShoppingList(plan, deals, prefs, { picks: { [item.key]: other.dealId } }).groups.flatMap((g) => g.items).find((i) => i.key === item.key)
    expect(picked.deal.dealId).toBe(other.dealId)
  })
})

describe('breakfast and lunch sale items', () => {
  const shelf = [...deals, { dealId: 'c1', name: 'Cheerios Cereal, 400 g', price: 3.99, merchant: 'Metro' }, { dealId: 'b1', name: 'Maple Leaf Bacon, 375 g', price: 4.99, merchant: 'Metro' }]
  it('plans breakfast around cereal, bacon, yogurt and the like', () => {
    const items = new Set(heroDeals(shelf, prefs, 'breakfast').map((h) => h.item))
    expect(items.has('cereal')).toBe(true)
    expect(items.has('bacon')).toBe(true)
    const meals = anchorMeals('cereal', shelf, prefs, null, 'breakfast')
    expect(meals.length).toBeGreaterThan(0)
    expect(meals.every((m) => m.template.meal === 'breakfast' && m.lines.some((l) => l.ing.item === 'cereal'))).toBe(true)
  })
  it('plans lunch around sandwich staples', () => {
    const heroes = heroDeals(shelf, prefs, 'lunch')
    expect(heroes.some((h) => h.label === 'Sandwich meat')).toBe(true)
    expect(anchorMeals('bacon', shelf, prefs, null, 'lunch').some((m) => m.template.id === 'blt')).toBe(true)
  })
})
