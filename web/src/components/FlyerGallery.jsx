// Every flyer deal on the list as a tiled wall, to hand the cashier when price matching.
// Tap an ad to blow it up; the store chips open each store's full flyer.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import FlyerClip from './FlyerClip'
import { dealName, flyerUrl, shortDay, storeTint } from '../lib/stores'

export default function FlyerGallery({ open, flyers, stores = [], store, onClose }) {
  const [zoom, setZoom] = useState(null)
  if (!open) return null
  const close = () => {
    setZoom(null)
    onClose()
  }
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100" role="dialog" aria-modal="true" aria-label="All flyer ads">
      <div className="border-b border-stone-200 bg-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Price match · {flyers.length} items</p>
            {store && <p className="text-xs text-stone-500">Shopping at {store}</p>}
          </div>
          <button onClick={close} className="rounded-lg px-3 py-1.5 text-sm font-medium text-green-700">
            Done
          </button>
        </div>
        {stores.length > 0 && (
          <div className="mt-2">
            <p className="mb-1.5 text-[11px] text-stone-500">Check against each store's full flyer:</p>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
              {stores.map((s) => (
                <a key={s} href={flyerUrl(s)} target="_blank" rel="noreferrer" className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${storeTint(s)}`}>
                  {s} ↗
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mx-auto max-w-5xl columns-2 gap-2 sm:columns-3 lg:columns-4">
          {flyers.map(({ item, deal }) => (
            <button
              key={item}
              onClick={() => setZoom({ item, deal })}
              className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl bg-white text-left shadow-sm"
            >
              <FlyerClip deal={deal} maxHeight="12rem" className="p-2" />
              <span className="flex items-baseline justify-between gap-1 border-t border-stone-100 px-2 py-1.5">
                <span className="min-w-0 truncate text-[11px] font-semibold">{deal.merchant}</span>
                <span className="shrink-0 text-sm font-bold text-green-700">{deal.priceLabel || deal.priceText}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      {zoom && (
        <div className="fixed inset-0 z-10 flex flex-col bg-black/80 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]" onClick={() => setZoom(null)}>
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center" onClick={(e) => e.stopPropagation()}>
            <figure className="overflow-hidden rounded-2xl bg-white">
              <FlyerClip deal={zoom.deal} maxHeight="65vh" />
              <figcaption className="flex items-end justify-between gap-3 border-t border-stone-100 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-base font-bold">{zoom.deal.merchant}</span>
                  <span className="block truncate text-sm text-stone-600">{dealName(zoom.deal.name)}</span>
                  {zoom.deal.validTo && <span className="block text-xs text-stone-400">Valid until {shortDay(zoom.deal.validTo)}</span>}
                  <a
                    href={flyerUrl(zoom.deal.merchant)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    See it in {zoom.deal.merchant}'s flyer ↗
                  </a>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-2xl font-bold text-green-700">{zoom.deal.priceLabel || zoom.deal.priceText}</span>
                  {zoom.deal.saleStory && <span className="block text-xs text-stone-500">{zoom.deal.saleStory}</span>}
                </span>
              </figcaption>
            </figure>
            <button onClick={() => setZoom(null)} className="mt-3 self-center rounded-full bg-white/90 px-5 py-2 text-sm font-medium">
              Back to all flyers
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
