import { describe, expect, it } from 'vitest'
import { followMatch, matchableDeals, matchSources, tidyMatch } from './priceMatch'

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

describe('stores follow the price-match store', () => {
  it('picking a match store selects the flyers it accepts', () => {
    const p = followMatch({ stores: ['Sobeys', 'Metro'], matchAt: 'FreshCo', matchExtras: [] }, { stores: ['Sobeys', 'Metro'], matchAt: '' })
    expect(p.stores).toEqual(['FreshCo', 'No Frills', 'Food Basics', 'Real Canadian Superstore', 'Walmart'])
  })
  it('turning matching off goes back to every store', () => {
    expect(followMatch({ stores: ['FreshCo'], matchAt: '' }, { stores: ['FreshCo'], matchAt: 'FreshCo' }).stores).toEqual([])
  })
  it('leaves store picks alone when the match store did not change', () => {
    const prev = { stores: ['No Frills'], matchAt: 'FreshCo', matchExtras: [] }
    expect(followMatch({ ...prev, stores: ['Walmart'] }, prev).stores).toEqual(['Walmart'])
  })
  it('drops saved stores the match store will not accept', () => {
    expect(tidyMatch({ stores: ['Sobeys', 'Walmart', 'Farm Boy'], matchAt: 'FreshCo', matchExtras: [] }).stores).toEqual(['Walmart'])
  })
})
