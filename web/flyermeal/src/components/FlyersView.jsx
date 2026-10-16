// A wall of flyer ads, like Flyer2Recipes' price-match view: the ads for what's on your list (to
// show a cashier), or every deal near you. Store chips narrow it to one store; tapping an ad opens
// the flyer price card, with a button to add it to the list.
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import FlyerClip from '@f2r/components/FlyerClip'
import FlyerProof from '@f2r/components/FlyerProof'
import { dealName, flyerUrl, storeTint } from '@f2r/lib/stores'

const PAGE = 40 // ads drawn at a time; each one loads flyer image tiles

const fold = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function FlyersView({ open, deals, mine, onClose, add, onList }) {
  const [view, setView] = useState('mine') // 'mine' | 'all'
  const showing = view === 'mine' ? mine : deals
  const stores = useMemo(() => {
    const n = new Map()
    for (const d of showing) n.set(d.merchant, (n.get(d.merchant) || 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [showing])
  const [store, setStore] = useState(null)
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [zoom, setZoom] = useState(null)

  const ads = useMemo(() => {
    const rank = new Map(stores.map((s, i) => [s, i]))
    const words = fold(q).split(/\s+/).filter(Boolean)
    // Store by store, each in flyer page order, so it reads like flipping through the flyers.
    return showing
      .filter((d) => (!store || d.merchant === store) && words.every((w) => fold(d.name).includes(w)))
      .sort((a, b) => rank.get(a.merchant) - rank.get(b.merchant) || (a.page ?? 99) - (b.page ?? 99))
  }, [showing, stores, store, q])

  if (!open) return null
  const pick = (s) => {
    setStore(s === store ? null : s)
    setShown(PAGE)
  }
  const close = () => {
    setZoom(null)
    onClose()
  }
  const switchTo = (v) => {
    setView(v)
    setStore(null)
    setShown(PAGE)
  }
  const zoomName = zoom && dealName(zoom.name)
  const zoomAdded = zoom && onList(zoomName)

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100" role="dialog" aria-modal="true" aria-label="All flyers">
      <div className="border-b border-stone-200 bg-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {view === 'mine' ? 'My list' : "This week's flyers"} · {ads.length.toLocaleString()} {ads.length === 1 ? 'ad' : 'ads'}
            </p>
            <p className="text-xs text-stone-500">{store ? `Showing ${store}` : `${stores.length} ${stores.length === 1 ? 'store' : 'stores'}`}</p>
          </div>
          <button onClick={close} className="rounded-lg px-3 py-1.5 text-sm font-medium text-orange-700">
            Done
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-semibold" role="group" aria-label="Which ads">
          {[['mine', `My list (${mine.length})`], ['all', 'All deals']].map(([v, label]) => (
            <button key={v} onClick={() => switchTo(v)} aria-pressed={view === v} className={`rounded-lg py-1.5 ${view === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => (setQ(e.target.value), setShown(PAGE))}
          placeholder={view === 'mine' ? 'Search your list' : 'Search every flyer, like coffee'}
          aria-label="Search the flyers"
          className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-base focus:border-orange-500 focus:outline-none"
        />
        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Store">
          <button
            onClick={() => pick(null)}
            aria-pressed={!store}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${!store ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-700'}`}
          >
            All stores
          </button>
          {stores.map((s) => (
            <button
              key={s}
              onClick={() => pick(s)}
              aria-pressed={store === s}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${storeTint(s)} ${store === s ? 'ring-2 ring-stone-800' : store ? 'opacity-60' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
        {store && (
          <a href={flyerUrl(store)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-orange-700 underline">
            See {store}'s full flyer ↗
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mx-auto max-w-5xl columns-2 gap-2 sm:columns-3 lg:columns-4">
          {ads.slice(0, shown).map((d) => {
            const added = onList(dealName(d.name))
            return (
              <button
                key={d.dealId}
                onClick={() => setZoom(d)}
                className="relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl bg-white text-left shadow-sm transition hover:shadow-md hover:ring-2 hover:ring-orange-300"
                aria-label={`${dealName(d.name)}, ${d.priceLabel || d.priceText} at ${d.merchant}`}
              >
                <FlyerClip deal={d} sharp={480} />
                <span className="flex items-baseline justify-between gap-1 border-t border-stone-100 px-2 py-1.5">
                  <span className="min-w-0 truncate text-[11px] font-semibold">{d.merchant}</span>
                  <span className="shrink-0 text-sm font-bold text-green-700">{d.priceLabel || d.priceText}</span>
                </span>
                {added && view === 'all' && <span className="absolute top-1.5 right-1.5 rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">✓ On list</span>}
              </button>
            )
          })}
        </div>
        {!ads.length &&
          (view === 'mine' && !mine.length ? (
            <div className="py-10 text-center text-sm text-stone-500">
              <p>Nothing on your list is in this week's flyers yet.</p>
              <button onClick={() => switchTo('all')} className="mt-3 rounded-full bg-white px-4 py-2 font-medium text-orange-700 shadow-sm">
                Browse all deals
              </button>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-stone-500">Nothing in {store ? `${store}'s flyer` : 'the flyers'} matches that.</p>
          ))}
        {ads.length > shown && (
          <button onClick={() => setShown(shown + PAGE)} className="mx-auto mt-2 mb-4 block rounded-full bg-white px-5 py-2 text-sm font-medium shadow-sm">
            Show more ({(ads.length - shown).toLocaleString()} left)
          </button>
        )}
      </div>

      <FlyerProof
        deal={zoom}
        onClose={() => setZoom(null)}
        action={zoom && { label: zoomAdded ? '✓ On your list' : '+ Add to my list', onClick: () => (zoomAdded ? null : add(zoomName.toLowerCase(), zoom.dealId)) }}
      />
    </div>,
    document.body,
  )
}
