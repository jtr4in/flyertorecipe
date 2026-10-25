import { describe, expect, it } from 'vitest'
import { bestDeal } from './deals'

const ad = (dealId, name, price) => ({ dealId, name, merchant: 'Store', price, priceLabel: `$${price}`, aisle: 'Produce' })

describe('bestDeal', () => {
  it("doesn't pick a flavoured product over the real thing", () => {
    const deals = [ad('f1', 'Progressive VegeGreens Powder Strawberry Banana', 36.79), ad('f2', 'Equifruit Organic and Fair Trade Bananas, Product of Ecuador', 0.89)]
    expect(bestDeal('bananas', deals).dealId).toBe('f2')
  })
})
