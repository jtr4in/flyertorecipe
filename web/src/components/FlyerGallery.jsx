// Every flyer ad on the list in one scroll, to hand the cashier when price matching.
import { createPortal } from 'react-dom'
import FlyerClip from './FlyerClip'
import { dealName, flyerUrl, shortDay } from '../lib/stores'

export default function FlyerGallery({ open, flyers, store, onClose }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100" role="dialog" aria-modal="true" aria-label="All flyer ads">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div>
          <p className="text-sm font-semibold">Price match · {flyers.length} items</p>
          {store && <p className="text-xs text-stone-500">Shopping at {store}</p>}
        </div>
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-green-700">
          Done
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-md space-y-3">
          {flyers.map(({ item, deal }) => (
            <figure key={item} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <FlyerClip deal={deal} />
              <figcaption className="flex items-end justify-between gap-3 border-t border-stone-100 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-base font-bold">{deal.merchant}</span>
                  <span className="block truncate text-sm text-stone-600">{dealName(deal.name)}</span>
                  {deal.validTo && <span className="block text-xs text-stone-400">Valid until {shortDay(deal.validTo)}</span>}
                  <a href={flyerUrl(deal.merchant)} target="_blank" rel="noreferrer" className="text-xs font-medium text-green-700 underline">
                    Full flyer ↗
                  </a>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-2xl font-bold text-green-700">{deal.priceLabel || deal.priceText}</span>
                  {deal.saleStory && <span className="block text-xs text-stone-500">{deal.saleStory}</span>}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
