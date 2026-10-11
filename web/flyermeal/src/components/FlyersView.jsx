// Every flyer near you: pick a store, scroll its ads, add anything to the list.
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import FlyerClip from '@f2r/components/FlyerClip'
import { dealName, flyerUrl, shortDay } from '@f2r/lib/stores'

const PAGE = 40 // ads drawn at a time; each one loads flyer image tiles

const fold = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function FlyersView({ open, deals, onClose, add, onList }) {
  const stores = useMemo(() => {
    const by = new Map()
    for (const d of deals) {
      const s = by.get(d.merchant) || { name: d.merchant, deals: [], until: d.validTo }
      s.deals.push(d)
      if (d.validTo && (!s.until || d.validTo < s.until)) s.until = d.validTo
      by.set(d.merchant, s)
    }
    return [...by.values()].sort((a, b) => b.deals.length - a.deals.length)
  }, [deals])
  const [store, setStore] = useState(null)
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)

  const current = store && stores.find((s) => s.name === store)
  const ads = useMemo(() => {
    if (!current) return []
    const words = fold(q).split(/\s+/).filter(Boolean)
    // Flyer order (page by page) reads like the paper flyer.
    return current.deals.filter((d) => words.every((w) => fold(d.name).includes(w))).sort((a, b) => (a.page ?? 99) - (b.page ?? 99))
  }, [current, q])

  if (!open) return null
  const pick = (name) => {
    setStore(name)
    setQ('')
    setShown(PAGE)
  }
  const close = () => {
    setStore(null)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100" role="dialog" aria-modal="true" aria-label="All flyers">
      <div className="border-b border-stone-200 bg-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between gap-3">
          {current ? (
            <button onClick={() => setStore(null)} className="-ml-2 rounded-lg px-2 py-1.5 text-sm font-medium text-orange-700">
              ‹ All stores
            </button>
          ) : (
            <p className="font-semibold">This week's flyers · {stores.length} stores</p>
          )}
          <button onClick={close} className="rounded-lg px-3 py-1.5 text-sm font-medium text-orange-700">
            Done
          </button>
        </div>
        {current && (
          <>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <h2 className="truncate text-lg font-bold">{current.name}</h2>
              <a href={flyerUrl(current.name)} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-orange-700 underline">
                Store's site ↗
              </a>
            </div>
            <input
              value={q}
              onChange={(e) => (setQ(e.target.value), setShown(PAGE))}
              placeholder={`Search ${current.deals.length} ads, like coffee`}
              aria-label={`Search ${current.name}'s flyer`}
              className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-base focus:border-orange-500 focus:outline-none"
            />
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!current ? (
          <ul className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
            {stores.map((s) => (
              <li key={s.name}>
                <button onClick={() => pick(s.name)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-2 text-left shadow-sm active:scale-[0.99]">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-50">
                    <FlyerClip deal={s.deals.find((d) => d.page === 1) || s.deals[0]} maxHeight="4rem" sharp={200} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.name}</p>
                    <p className="text-sm text-stone-500">
                      {s.deals.length} deals{s.until && ` · until ${shortDay(s.until)}`}
                    </p>
                  </div>
                  <span className="pr-2 text-stone-300">›</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="mx-auto max-w-5xl columns-2 gap-2 sm:columns-3 lg:columns-4">
              {ads.slice(0, shown).map((d) => {
                const name = dealName(d.name)
                const added = onList(name)
                return (
                  <div key={d.dealId} className="mb-2 break-inside-avoid overflow-hidden rounded-xl bg-white shadow-sm">
                    <FlyerClip deal={d} sharp={480} />
                    <p className="truncate border-t border-stone-100 px-2 pt-1 text-xs text-stone-500">{name}</p>
                    <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
                      <span className="text-sm font-bold text-green-700">{d.priceLabel || d.priceText}</span>
                      <button
                        onClick={() => add(name.toLowerCase(), d.dealId)}
                        disabled={added}
                        className="shrink-0 rounded-full border border-orange-200 px-2.5 py-0.5 text-xs font-semibold text-orange-700 disabled:border-green-200 disabled:text-green-700"
                        aria-label={added ? `${name} is on your list` : `Add ${name} to my list`}
                      >
                        {added ? '✓ Added' : '+ List'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {!ads.length && <p className="py-10 text-center text-sm text-stone-500">Nothing in {current.name}'s flyer matches that.</p>}
            {ads.length > shown && (
              <button onClick={() => setShown(shown + PAGE)} className="mx-auto mt-2 block rounded-full bg-white px-5 py-2 text-sm font-medium shadow-sm">
                Show more ({ads.length - shown} left)
              </button>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
