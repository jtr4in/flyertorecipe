import { describe, expect, it } from 'vitest'
import { estimate, poundsFor, poundsIn } from './estimate'

describe('poundsIn', () => {
  it('reads metric and imperial weights', () => {
    expect(poundsIn('700 g (1 1/2 lb), boneless')).toBeCloseTo(1.54, 2)
    expect(poundsIn('1.4 kg (3 lb), boneless')).toBeCloseTo(3.09, 2)
    expect(poundsIn('500g')).toBeCloseTo(1.1, 2)
    expect(poundsIn('12 oz')).toBe(0.75)
    expect(poundsIn('2 large')).toBe(null)
    expect(poundsIn('1 egg')).toBe(null)
  })
})

describe('poundsFor', () => {
  it('weighs counted things', () => {
    expect(poundsFor('chicken breasts', '2 large, sliced')).toBe(1)
    expect(poundsFor('chicken thighs', '8 bone-in, skin-on')).toBeCloseTo(2.4)
    expect(poundsFor('ground beef', '450 g (1 lb)')).toBeCloseTo(0.99, 2)
    expect(poundsFor('parmesan', '1/2 cup grated')).toBe(null)
  })
})

describe('estimate', () => {
  it('prices by the pound from the recipe amount, else a guessed pound', () => {
    expect(estimate({ price: 3.49, unit: '/lb' }, 1.5)).toEqual({ cost: 5.24, qty: '1.5 lb', guessed: false })
    expect(estimate({ price: 3.49, unit: '/lb' }, null)).toEqual({ cost: 3.49, qty: '1 lb', guessed: true })
    expect(estimate({ price: 7.69, unit: '/kg' }, 2.2046).cost).toBe(7.69)
    expect(estimate({ price: 1.99, unit: '/100 g' }, null).cost).toBe(4.51)
    expect(estimate({ price: 4.99, unit: '' }, 3)).toEqual({ cost: 4.99, qty: null, guessed: false })
  })
})
