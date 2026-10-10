// A stable colour per store for list badges (no logos, just a consistent tint).
const PALETTE = [
  'bg-amber-100 text-amber-900', 'bg-sky-100 text-sky-900', 'bg-rose-100 text-rose-900',
  'bg-emerald-100 text-emerald-900', 'bg-violet-100 text-violet-900', 'bg-orange-100 text-orange-900',
  'bg-lime-100 text-lime-900', 'bg-cyan-100 text-cyan-900', 'bg-fuchsia-100 text-fuchsia-900',
]
export function storeTint(name) {
  if (!name || name === 'Any store') return 'bg-stone-200 text-stone-700'
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export const money = (n) => `$${(n ?? 0).toFixed(2)}`

export function shortDay(iso) {
  if (!iso) return null
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('en-CA', { weekday: 'short' })
}

export function mapsUrl(store, postalCode) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store} near ${postalCode || ''}`)}`
}

// Quebec flyers list items as "FRENCH | ENGLISH"; show the English half.
const FRENCH = /[éèêàâçôûî]|\b(ou|de|des|du|aux?|le|la|les)\b/i
export function dealName(name) {
  const parts = (name || '').split('|').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return name
  return parts.find((p) => !FRENCH.test(p)) || parts[parts.length - 1]
}

// Each store's own weekly-flyer page, to check a price against the full flyer.
// Stores not listed fall back to a web search for their current flyer.
const FLYER_PAGES = {
  metro: 'https://www.metro.ca/en/flyer',
  'food basics': 'https://www.foodbasics.ca/flyer',
  'super c': 'https://www.superc.ca/en/flyer',
  walmart: 'https://www.walmart.ca/en/flyer',
  iga: 'https://www.iga.net/en/flyer',
  sobeys: 'https://www.sobeys.com/en/flyer/',
  freshco: 'https://freshco.com/flyer/',
  'no frills': 'https://www.nofrills.ca/print-flyer',
  'real canadian superstore': 'https://www.realcanadiansuperstore.ca/print-flyer',
  loblaws: 'https://www.loblaws.ca/print-flyer',
  provigo: 'https://www.provigo.ca/print-flyer',
  maxi: 'https://www.maxi.ca/print-flyer',
  'your independent grocer': 'https://www.yourindependentgrocer.ca/print-flyer',
  'wholesale club': 'https://www.wholesaleclub.ca/print-flyer',
  'shoppers drug mart': 'https://www.shoppersdrugmart.ca/flyer',
  pharmaprix: 'https://www.pharmaprix.ca/flyer',
  'farm boy': 'https://www.farmboy.ca/weekly-flyer-specials/',
  'giant tiger': 'https://www.gianttiger.com/pages/flyer',
}
export function flyerUrl(merchant) {
  const m = (merchant || '').toLowerCase()
  const key = Object.keys(FLYER_PAGES).find((k) => m.startsWith(k))
  return key ? FLYER_PAGES[key] : `https://www.google.com/search?q=${encodeURIComponent(`${merchant} weekly flyer`)}`
}
