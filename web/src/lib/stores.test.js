import { describe, expect, it } from 'vitest'
import { flippUrl } from './stores'

describe('flippUrl', () => {
  it('opens the one ad in your area, so regional flyers are not shown as expired', () => {
    expect(flippUrl({ dealId: 'f1048227931' }, 'k4a 1a1')).toBe('https://flipp.com/en-ca/item/1048227931?postal_code=K4A1A1')
  })
  it('falls back to the whole flyer', () => {
    expect(flippUrl({ dealId: 'x9', flyerId: 7654321 }, 'K4A1A1')).toBe('https://flipp.com/en-ca/weekly_ad/7654321?postal_code=K4A1A1')
  })
  it('leaves out a postal code that is not one', () => {
    expect(flippUrl({ dealId: 'f12' }, 'Ottawa')).toBe('https://flipp.com/en-ca/item/12')
    expect(flippUrl({ dealId: 'x' })).toBe(null)
  })
})
