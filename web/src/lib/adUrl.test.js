import { describe, expect, it } from 'vitest'
import { adUrl } from './stores'

describe('ad links', () => {
  it('opens the deal on Walmart’s site from its flyer item id', () => {
    expect(adUrl({ dealId: 'f1046416061', merchant: 'Walmart' })).toBe('https://www.walmart.ca/en/flyer?flyer_item_id=1046416061')
  })
  it('has no item link for other stores or deals without a flyer item id', () => {
    expect(adUrl({ dealId: 'f1045364114', merchant: 'No Frills' })).toBeNull()
    expect(adUrl({ dealId: 'abc', merchant: 'Walmart' })).toBeNull()
  })
})
