// Floating flyer card to show a cashier when price matching.
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import FlyerClip from './FlyerClip'
import { flyerUrl } from '../lib/stores'

// Date-only strings parse as UTC midnight, which shows as the previous day in Canada.
const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }) : null

export default function FlyerProof({ deal, onClose, action }) {
  useEffect(() => {
    if (!deal) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [deal, onClose])
  if (!deal) return null
  const from = fmtDate(deal.validFrom)
  const to = fmtDate(deal.validTo)
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${deal.merchant} flyer: ${deal.name}`}
    >
      <button className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <p className="text-sm font-semibold tracking-wide text-stone-500 uppercase">Flyer price</p>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-green-700">
            Done
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-5 text-center">
          <FlyerClip deal={deal} maxHeight="45vh" className="rounded-lg shadow-sm" />
          <p className="mt-4 text-xl font-bold">{deal.merchant}</p>
          <p className="mt-1">{deal.name}</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{deal.priceLabel || deal.priceText}</p>
          {deal.saleStory && <p className="mt-1 text-stone-600">{deal.saleStory}</p>}
          {deal.priceText && deal.priceLabel && deal.priceText !== deal.priceLabel && /\d/.test(deal.priceText) && (
            <p className="mt-1 text-sm text-stone-500">Flyer says: {deal.priceText}</p>
          )}
          {(from || to) && (
            <p className="mt-4 text-sm text-stone-500">
              Valid {from && <>{from} </>}
              {to && <>to {to}</>}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {action && (
              <button onClick={action.onClick} className="rounded-xl border border-green-700 px-4 py-2 text-sm font-semibold text-green-700">
                {action.label}
              </button>
            )}
            <a
              href={flyerUrl(deal.merchant)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white"
            >
              See {deal.merchant}'s full flyer ↗
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
