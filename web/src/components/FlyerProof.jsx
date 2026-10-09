// Full-screen flyer view to show a cashier when price matching.
import { createPortal } from 'react-dom'
import { flyerUrl } from '../lib/stores'

// Date-only strings parse as UTC midnight, which shows as the previous day in Canada.
const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }) : null

export default function FlyerProof({ deal, onClose }) {
  if (!deal) return null
  const from = fmtDate(deal.validFrom)
  const to = fmtDate(deal.validTo)
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${deal.merchant} flyer: ${deal.name}`}
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-semibold tracking-wide text-stone-500 uppercase">Flyer price</p>
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-green-700">
          Done
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-6 text-center">
        {deal.imageUrl ? (
          <img src={deal.imageUrl} alt={deal.name} className="max-h-[50vh] w-auto rounded-lg object-contain" />
        ) : (
          <p className="rounded-lg bg-stone-100 p-6 text-sm text-stone-500">No flyer image for this item.</p>
        )}
        <p className="mt-6 text-2xl font-bold">{deal.merchant}</p>
        <p className="mt-1 text-lg">{deal.name}</p>
        <p className="mt-3 text-4xl font-bold text-green-700">{deal.priceLabel || deal.priceText}</p>
        {deal.saleStory && <p className="mt-1 text-stone-600">{deal.saleStory}</p>}
        {deal.priceText && deal.priceLabel && deal.priceText !== deal.priceLabel && (
          <p className="mt-1 text-sm text-stone-500">Flyer says: {deal.priceText}</p>
        )}
        {(from || to) && (
          <p className="mt-4 text-sm text-stone-500">
            Valid {from && <>{from} </>}
            {to && <>to {to}</>}
          </p>
        )}
        <a href={flyerUrl(deal.merchant)} target="_blank" rel="noreferrer" className="mt-5 rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-green-700">
          See {deal.merchant}'s full flyer ↗
        </a>
      </div>
    </div>,
    document.body,
  )
}
