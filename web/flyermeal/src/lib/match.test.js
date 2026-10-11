import { describe, expect, it } from 'vitest'
import { covers, norm, rankRecipes, scoreRecipe } from './match'

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

describe('rankRecipes', () => {
  const recipes = [
    recipe('Chicken Fajitas', ['Chicken Breast', 'Red Pepper', 'Tortillas', 'Onion', 'Olive Oil', 'Lime']),
    recipe('Chicken Curry', ['Chicken Thighs', 'Coconut Milk', 'Curry Powder', 'Garlic', 'Basmati Rice']),
    recipe('Beef Stew', ['Beef', 'Potatoes', 'Carrots', 'Beef Stock']),
  ]
  it('ranks by list items used, then fewest to buy; pantry counts as covered', () => {
    const list = ['chicken', 'peppers', 'tortillas'].map(norm)
    const ranked = rankRecipes(recipes, list)
    expect(ranked.map((r) => r.recipe.name)).toEqual(['Chicken Fajitas', 'Chicken Curry'])
    const s = scoreRecipe(recipes[0], list)
    expect(s.uses).toBe(3)
    expect(s.lines.filter((l) => l.status === 'need').map((l) => l.name)).toEqual(['Lime'])
  })
})

describe('everyday kitchen and look-alikes', () => {
  it('counts plain oils and vinegars as pantry, and rice noodles are not rice', () => {
    const s = scoreRecipe(recipe('Pad See Ew', ['rice stick noodles', 'white vinegar', 'peanut oil', 'dark soy sauce', 'sesame oil']), [norm('rice')])
    expect(s.lines.map((l) => l.status)).toEqual(['need', 'pantry', 'pantry', 'pantry', 'need'])
  })
})
