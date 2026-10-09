import { describe, expect, it } from 'vitest'
import { activeDeals, cookedMeals, planWeek, suggestMeals, weekDays } from './planner'
import { sampleDeals } from '../data/sampleDeals'
import { dislikedItems, LIKE_GROUPS } from './likes'
import { CATALOG } from '../data/ingredients'

const today = new Date('2026-10-09T12:00:00Z')
const deals = activeDeals(sampleDeals(today), { today })
const days = weekDays(new Date('2026-10-09T12:00:00'))
const prefs = { householdSize: 2, diet: [], stores: [], meals: ['breakfast', 'lunch', 'dinner', 'snack'], lunchLeftovers: false }
const all = new Set(Object.values(CATALOG).flat().map((i) => i.item))

describe('build my week', () => {
  it('every quiz option is a real ingredient', () => {
    for (const g of LIKE_GROUPS) for (const o of g.options) for (const i of o.items) expect(all.has(i), i).toBe(true)
  })
  it('only answered kinds of food limit the plan', () => {
    const d = dislikedItems({ protein: ['chicken'], carb: [] })
    expect(d.has('ground beef')).toBe(true)
    expect(d.has('chicken thighs')).toBe(false)
    expect(d.has('rice')).toBe(false)
  })
  it('plans only the scheduled meals', () => {
    // Weekdays: dinner only. Weekends: breakfast and dinner.
    const schedule = { 0: ['breakfast', 'dinner'], 6: ['breakfast', 'dinner'], 1: ['dinner'], 2: ['dinner'], 3: ['dinner'], 4: ['dinner'], 5: ['dinner'] }
    const plan = planWeek(deals, { ...prefs, schedule }, { days })
    for (const d of plan) {
      const weekend = [0, 6].includes(d.date.getDay())
      expect(!!d.meals.dinner.lines).toBe(true)
      expect(!!d.meals.breakfast.lines).toBe(weekend)
      expect(d.meals.lunch.off).toBe(true)
    }
  })
  it('an off-schedule meal can still be planned on request', () => {
    const schedule = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: ['dinner'], 6: [] }
    const key = `${days[1].key}|lunch`
    const plan = planWeek(deals, { ...prefs, schedule }, { days, overrides: { [key]: { on: true } } })
    expect(!!plan[1].meals.lunch.lines).toBe(true)
  })
  it('dinners stick to the proteins, carbs and veg they like', () => {
    const likes = { protein: ['chicken', 'shrimp'], carb: ['rice'], veg: ['broccoli', 'bell peppers', 'carrots', 'spinach'] }
    const plan = planWeek(deals, { ...prefs, likes }, { days })
    const bad = dislikedItems(likes)
    const dinners = plan.map((d) => d.meals.dinner).filter((m) => m.lines)
    expect(dinners.length).toBe(7)
    const offenders = dinners.flatMap((m) => m.lines.filter((l) => bad.has(l.ing.item)).map((l) => `${m.name}: ${l.ing.item}`))
    expect(offenders).toEqual([])
    const ideas = suggestMeals(dinners[0], deals, { ...prefs, likes }, { plan })
    expect(ideas.slice(0, 6).flatMap((m) => m.lines).filter((l) => bad.has(l.ing.item))).toEqual([])
  })
  it('without answers the plan is unchanged', () => {
    const a = cookedMeals(planWeek(deals, prefs, { days })).map((m) => m.name)
    const b = cookedMeals(planWeek(deals, { ...prefs, likes: {}, schedule: null }, { days })).map((m) => m.name)
    expect(b).toEqual(a)
  })
})

describe('recipes added from browsing', () => {
  it('a picked lunch is cooked, not leftovers, even when lunch is off the schedule', () => {
    const schedule = { 0: ['dinner'], 1: ['dinner'], 2: ['dinner'], 3: ['dinner'], 4: ['dinner'], 5: ['dinner'], 6: ['dinner'] }
    const key = `${days[2].key}|lunch`
    const plan = planWeek(deals, { ...prefs, meals: ['dinner'], schedule, lunchLeftovers: true }, { days, overrides: { [key]: { on: true, template: 'caesar-salad' } } })
    expect(plan[2].meals.lunch.template?.id).toBe('caesar-salad')
    expect(plan[1].meals.lunch).toBeUndefined()
  })
})
