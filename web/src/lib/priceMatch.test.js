import { describe, expect, it } from 'vitest'
import { matchableDeals, matchSources } from './priceMatch'

const deals = ['FreshCo', 'No Frills', 'Walmart', 'Metro', 'Farm Boy', 'Food Basics'].map((merchant) => ({ merchant, name: 'x' }))
const stores = (ds) => ds.map((d) => d.merchant)

describe('price matching', () => {
  it('FreshCo only takes its four discount competitors', () => {
    expect(stores(matchableDeals(deals, 'FreshCo'))).toEqual(['FreshCo', 'No Frills', 'Walmart', 'Food Basics'])
  })
  it('No Frills takes major supermarkets, and Farm Boy only when asked', () => {
    expect(stores(matchableDeals(deals, 'No Frills'))).not.toContain('Farm Boy')
    expect(stores(matchableDeals(deals, 'No Frills', ['Farm Boy']))).toContain('Farm Boy')
    expect(stores(matchableDeals(deals, 'No Frills'))).toContain('Metro')
  })
  it('no store means every flyer', () => {
    expect(matchableDeals(deals, '')).toHaveLength(deals.length)
    expect(matchSources('Metro')).toBeNull()
  })
})
