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
