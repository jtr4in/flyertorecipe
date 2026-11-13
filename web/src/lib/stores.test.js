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
  it('opens the ad in the Flipp app on Android, like Flipp share links', () => {
    const url = flippUrl({ dealId: 'f1052918822', flyerId: 8222010 }, 'K4A 4S2', 'Mozilla/5.0 (Linux; Android 14; Pixel 8)')
    expect(url.startsWith('intent://?')).toBe(true)
    expect(url).toContain('#Intent;scheme=com.wishabi.flipp;package=com.wishabi.flipp;')
    const link = new URLSearchParams(url.slice('intent://?'.length, url.indexOf('#'))).get('deep_link_value')
    const action = new URL(link)
    expect(action.origin + action.pathname).toBe('https://flipp.com/action')
    expect(Object.fromEntries(action.searchParams)).toEqual({ type: 'flyer_view', flyer_id: '8222010', command: 'zoom', flyer_item_id: '1052918822', postal_code: 'K4A4S2' })
    expect(decodeURIComponent(url.split('S.browser_fallback_url=')[1].replace(';end', ''))).toBe('https://flipp.com/en-ca/item/1052918822?postal_code=K4A4S2')
  })
})
