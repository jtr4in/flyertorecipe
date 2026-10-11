// "Other options" for a grocery list item: every deal on that same thing this week (all the
// cucumbers on sale), so the household can pick a different brand, size or store.
import { useState } from 'react'
import Sheet from './Sheet'
import FlyerClip from './FlyerClip'
import { dealName, storeTint } from '../lib/stores'

// Flyers repeat an ad on several pages; show each product, store and price once.
const once = (deals) => {
  const seen = new Set()
  return deals.filter((d) => {
    const k = `${dealName(d.name).toLowerCase()}|${d.merchant}|${d.price}`
    return !seen.has(k) && seen.add(k)
  })
}
// Some flyers shout every name ("CARROTS OR YELLOW ONIONS"); show those in sentence case.
const calm = (t) => (/[a-z]/.test(t) ? t : t.charAt(0) + t.slice(1).toLowerCase())

const fold = (t) =>
  (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
const NOT_BRAND =
  /^(rehausseur|cremeur|crémeur|boisson|cafe|café|lait|pain|fromage|selected|certain|assorted|assort|varieties|variety|the|fresh|frais|large|small|product|of|or|ou|and|et|pack|pk|bonus|club|size)$/i

// Hint text from this item's own deals: a brand, a store and a size that are really in the list.
function hintFor(options, item) {
  const itemWords = new Set(fold(item).split(/\s+/))
  // The brand named most often (brands repeat across stores; descriptive words rarely lead twice).
  const firsts = options
    .map((d) => dealName(d.name).split(/[\s,|]+/)[0])
    .filter((w) => /^[\p{L}'’&-]{3,}$/u.test(w) && !NOT_BRAND.test(w) && !itemWords.has(fold(w)) && !itemWords.has(fold(w).replace(/s$/, '')))
  const tally = firsts.reduce((m, w) => m.set(fold(w), [w, (m.get(fold(w))?.[1] || 0) + 1]), new Map())
  const brand = [...tally.values()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const counts = options.reduce((m, d) => m.set(d.merchant, (m.get(d.merchant) || 0) + 1), new Map())
  const store = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
  const sizes = options.map((d) => /\b\d+(?:[.,]\d+)?\s?(?:kg|g|ml|l|lb)\b/i.exec(d.name)?.[0]?.toLowerCase().replace(/\s/, ' ')).filter(Boolean)
  const size = [...sizes.reduce((m, z) => m.set(z, (m.get(z) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0]?.[0]
  const parts = [brand && calm(brand), store, size].filter(Boolean)
  return parts.length ? `Filter: ${parts.join(', ')}…` : 'Filter by brand, store or size'
}

export default function OptionsSheet({ item, options: all, onPick, onSwap, onClose }) {
  const options = once(all)
  // The filter belongs to one item; opening another item starts it empty.
  const [filter, setFilter] = useState({ key: null, q: '' })
  const q = filter.key === item?.key ? filter.q : ''
  const words = fold(q)
    .split(/[\s,]+/)
    .filter(Boolean)
  const shown = words.length ? options.filter((d) => words.every((w) => fold(`${d.name} ${d.merchant}`).includes(w))) : options
  return (
    <Sheet open={!!item} onClose={onClose} title={item ? `Other ${item.item} on sale` : ''} tall>
      {item && (
        <>
          {options.length === 0 ? (
            <p className="mb-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">No {item.item} deals in your flyers this week.</p>
          ) : options.length === 1 && options[0].dealId === item.deal?.dealId ? (
            <p className="mb-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">This is the only {item.item} deal in your flyers this week.</p>
          ) : (
            <>
              {options.length > 4 && (
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setFilter({ key: item.key, q: e.target.value })}
                  placeholder={hintFor(options, item.item)}
                  aria-label={`Filter ${item.item} deals`}
                  className="mb-3 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              )}
              {shown.length === 0 && <p className="mb-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">Nothing matches "{q}".</p>}
              <ul className="mb-4 space-y-2">
                {shown.map((d) => {
                  const current = d.dealId === item.deal?.dealId
                  return (
                    <li key={d.dealId ?? d.name}>
                      <button
                        onClick={() => onPick(d)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left ${current ? 'border-green-600 bg-green-50' : 'border-stone-200 bg-white'}`}
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-50">
                          {d.imageUrl ? (
                            <img src={d.imageUrl} alt="" loading="lazy" className="max-h-12 max-w-12 object-contain" />
                          ) : d.clip?.box ? (
                            <FlyerClip deal={d} sharp={160} maxHeight="3rem" />
                          ) : (
                            <span aria-hidden>🏷️</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm">{calm(dealName(d.name))}</span>
                          {current && <span className="text-xs font-medium text-green-700">On your list</span>}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold text-green-700">{d.priceLabel || d.priceText}</span>
                          <span className={`inline-block rounded-full px-1.5 text-[10px] font-medium ${storeTint(d.merchant)}`}>{d.merchant}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {item.uses?.length > 0 && (
            <button onClick={onSwap} className="text-sm font-medium text-green-700 underline">
              Use a different ingredient instead
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}
