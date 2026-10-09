import { describe, it, expect, afterEach } from 'vitest'
import RECIPES from './recipes.json'
import { fillText, setRecipes, TEMPLATES } from './templates'

describe('fillText', () => {
  it('fills slots and drops bracketed parts with empty slots', () => {
    const t = '{protein} & {veg} stir-fry[ with {veg2}] over {starch}'
    expect(fillText(t, { protein: 'chicken', veg: 'broccoli', starch: 'rice' })).toBe('chicken & broccoli stir-fry over rice')
    expect(fillText(t, { protein: 'chicken', veg: 'broccoli', veg2: 'peppers', starch: 'rice' })).toBe(
      'chicken & broccoli stir-fry with peppers over rice',
    )
  })
})

describe('setRecipes', () => {
  afterEach(() => setRecipes(RECIPES))

  it('swaps in a new list and skips invalid entries', () => {
    const ok = { id: 'x', meal: 'dinner', name: '{protein} tacos', slots: [{ key: 'protein', from: ['beef'] }] }
    expect(setRecipes([ok, { id: 'bad' }])).toBe(true)
    expect(TEMPLATES.map((t) => t.id)).toEqual(['x'])
    expect(TEMPLATES[0].name({ protein: 'ground beef' })).toBe('Ground beef tacos')
  })

  it('keeps the bundled list when given nothing usable', () => {
    expect(setRecipes([])).toBe(false)
    expect(TEMPLATES.length).toBe(RECIPES.length)
  })
})
