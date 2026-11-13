import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import FlyerClip from '@f2r/components/FlyerClip'
import { flippTarget, flippUrl } from '@f2r/lib/stores'

const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }) : null

// At the till, one ad per screen to hand the cashier: Next or a swipe moves on, with no app to
// switch to. Flipp stays a tap away for a cashier who wants to see the ad there. All Flipp links
// open in one named tab, so they don't pile up.
export default function TillMode({ lines, postal, onClose }) {
  const [i, setI] = useState(0)
  const touch = useRef(null)
  const n = lines.length
  const go = (step) => setI((x) => Math.min(n - 1, Math.max(0, x + step)))
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  if (!n) return null
  const l = lines[Math.min(i, n - 1)]
  const deal = l.deal
  const from = fmtDate(deal.validFrom)
  const to = fmtDate(deal.validTo)
  const flipp = flippUrl(deal, postal)
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Show ads at the till"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0)
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-semibold text-stone-500">
          Ad {i + 1} of {n}
        </p>
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 font-medium text-green-700">
          Done
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-4 text-center">
        <p className="text-2xl font-bold">{deal.merchant}</p>
        <FlyerClip deal={deal} maxHeight="48dvh" className="mt-3 rounded-lg shadow-sm" />
        <p className="mt-4 text-lg">{deal.name}</p>
        <p className="mt-1 text-4xl font-bold text-green-700">{deal.priceLabel || deal.priceText}</p>
        {deal.saleStory && <p className="mt-1 text-stone-600">{deal.saleStory}</p>}
        {(from || to) && (
          <p className="mt-2 text-sm text-stone-500">
            Valid {from && <>{from} </>}
            {to && <>to {to}</>}
          </p>
        )}
        {flipp && (
          <a href={flipp} target={flippTarget(flipp, 'flipp')} rel="noreferrer" className="mt-3 text-sm font-semibold text-sky-700">
            Show in Flipp ↗
          </a>
        )}
      </div>
      <div className="flex gap-3 border-t border-stone-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button onClick={() => go(-1)} disabled={i === 0} className="flex-1 rounded-2xl border border-stone-300 py-3 font-semibold text-stone-700 disabled:opacity-40">
          ‹ Back
        </button>
        {i < n - 1 ? (
          <button onClick={() => go(1)} className="flex-[2] rounded-2xl bg-green-700 py-3 font-semibold text-white">
            Next ad ›
          </button>
        ) : (
          <button onClick={onClose} className="flex-[2] rounded-2xl bg-green-700 py-3 font-semibold text-white">
            All done
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
