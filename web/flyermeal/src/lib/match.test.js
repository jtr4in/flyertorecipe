import { describe, expect, it } from 'vitest'
import { covers, norm, scoreRecipe, sortRecipes, withSwap } from './match'

describe('norm', () => {
  it('folds British names, plurals and prep words', () => {
    expect(norm('Minced Beef')).toBe('ground beef')
    expect(norm('Courgettes')).toBe('zucchini')
    expect(norm('Plain Flour')).toBe('flour')
    expect(norm('Extra Virgin Olive Oil')).toBe('oil')
    expect(norm('Garlic Clove')).toBe('garlic')
    expect(norm('Chicken Thighs')).toBe('chicken thigh')
    expect(norm('Ground Cumin')).toBe('cumin')
    expect(norm('Coriander')).toBe('cilantro')
    expect(norm('Ground Coriander')).toBe('coriander')
    expect(norm('Potatoes')).toBe('potato')
    expect(norm('Spaghetti')).toBe('pasta spaghetti')
  })
})

describe('covers', () => {
  it('matches the general and specific name either way', () => {
    expect(covers(norm('chicken'), norm('Chicken Thighs'))).toBe(true)
    expect(covers(norm('chicken breasts'), norm('Chicken'))).toBe(true)
    expect(covers(norm('pasta'), norm('Penne Rigate'))).toBe(true)
    expect(covers(norm('ground beef'), norm('Minced Beef'))).toBe(true)
  })
  it("doesn't count things made from it", () => {
    expect(covers(norm('chicken'), norm('Chicken Stock'))).toBe(false)
    expect(covers(norm('tomatoes'), norm('Tomato Puree'))).toBe(false)
    expect(covers(norm('lemon'), norm('Lemon Juice'))).toBe(false)
    expect(covers(norm('beef'), norm('Chicken'))).toBe(false)
  })
})

const recipe = (name, ings) => ({ name, category: 'Chicken', ingredients: ings.map((n) => ({ name: n, measure: '' })) })

describe('sortRecipes', () => {
  const recipes = [
    recipe('Beef Stew', ['Beef', 'Potatoes', 'Carrots', 'Beef Stock']),
    recipe('Chicken Curry', ['Chicken Thighs', 'Coconut Milk', 'Curry Powder', 'Garlic', 'Basmati Rice']),
    recipe('Chicken Fajitas', ['Chicken Breast', 'Red Pepper', 'Tortillas', 'Onion', 'Olive Oil', 'Lime']),
  ]
  it('keeps every recipe, most of your list first, library order otherwise', () => {
    const list = ['chicken', 'peppers', 'tortillas'].map(norm)
    expect(sortRecipes(recipes, list).map((r) => r.recipe.name)).toEqual(['Chicken Fajitas', 'Chicken Curry', 'Beef Stew'])
    expect(sortRecipes(recipes, []).map((r) => r.recipe.name)).toEqual(['Beef Stew', 'Chicken Curry', 'Chicken Fajitas'])
    const s = scoreRecipe(recipes[2], list)
    expect(s.uses).toBe(3)
    expect(s.lines.filter((l) => l.status === 'need').map((l) => l.name)).toEqual(['Lime'])
  })
})

describe('withSwap', () => {
  it('trades the sauce ingredients for the jar, and the jar counts against the list', () => {
    const r = recipe('Spaghetti and Meatballs', ['spaghetti', 'ground beef', 'crushed tomatoes', 'tomato paste', 'dried oregano'])
    const swap = { sauce: 'pasta sauce', measure: '1 jar', replaces: ['crushed tomatoes', 'tomato paste', 'dried oregano'] }
    const s = scoreRecipe(withSwap(r, swap), ['pasta sauce', 'ground beef'].map(norm))
    expect(s.lines.map((l) => [l.name, l.status])).toEqual([['spaghetti', 'need'], ['ground beef', 'list'], ['pasta sauce', 'list']])
    expect(withSwap(r, null)).toBe(r)
  })
  it("doesn't let fresh tomatoes on the list stand in for canned", () => {
    expect(covers(norm('tomatoes'), norm('crushed tomatoes'))).toBe(false)
  })
})

describe('everyday kitchen and look-alikes', () => {
  it('counts plain oils and vinegars as pantry, and rice noodles are not rice', () => {
    const s = scoreRecipe(recipe('Pad See Ew', ['rice stick noodles', 'white vinegar', 'peanut oil', 'dark soy sauce', 'sesame oil']), [norm('rice')])
    expect(s.lines.map((l) => l.status)).toEqual(['need', 'pantry', 'pantry', 'pantry', 'need'])
  })
})
