import { describe, expect, it } from 'vitest'
import { activeDeals, buildShoppingList } from './planner'
import { sampleDeals } from '../data/sampleDeals'
import { anchorMeals, heroDeals, poolMeals, poolPlan, quickMeal, toPick } from './anchors'

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
