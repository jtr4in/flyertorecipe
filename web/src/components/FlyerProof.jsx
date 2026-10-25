// Floating flyer card to show a cashier when price matching.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import FlyerClip from './FlyerClip'
import { dealName, flippUrl, flyerUrl, money } from '../lib/stores'

// Date-only strings parse as UTC midnight, which shows as the previous day in Canada.
const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }) : null

/**
 * `choices` (other ads for the same thing) turns the card into a picker: tap one to preview it up
 * top, then Swap to use it via `onChoose`, or Close to keep the current one.
 */
export default function FlyerProof({ deal: current, postal, onClose, action, choices, onChoose }) {
  const [preview, setPreview] = useState(null)
  useEffect(() => setPreview(null), [current?.dealId])
  const deal = preview || current || choices?.[0]
  const body = useRef(null)
  // The preview is at the top, so bring it into view when one is picked from further down.
  useEffect(() => body.current?.scrollTo({ top: 0, behavior: 'smooth' }), [preview])
  useEffect(() => {
    if (!deal) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [deal, onClose])
  const picking = choices?.length > 0 && onChoose
  // With no ad in use yet, the first choice shown can be taken as is.
  const swapping = picking && (preview ? preview.dealId !== current?.dealId : !current)
  if (!deal) return null
  const from = fmtDate(deal.validFrom)
  const to = fmtDate(deal.validTo)
  const flipp = flippUrl(deal, postal)
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
          <p className="text-sm font-semibold tracking-wide text-stone-500 uppercase">{swapping ? 'Previewing' : 'Flyer price'}</p>
          {!picking && (
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-green-700">
              Done
            </button>
          )}
        </div>
        <div ref={body} className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-5 text-center">
          <FlyerClip deal={deal} maxHeight={picking ? '26vh' : '45vh'} className="rounded-lg shadow-sm" />
          <p className="mt-4 text-xl font-bold">{deal.merchant}</p>
          <p className="mt-1">{deal.name}</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{deal.priceLabel || deal.priceText}</p>
          {deal.saleStory && <p className="mt-1 text-stone-600">{deal.saleStory}</p>}
          {deal.priceText && deal.priceLabel && deal.priceText !== deal.priceLabel && /\d/.test(deal.priceText) && (
            <p className="mt-1 text-sm text-stone-500">Flyer says: {deal.priceText}</p>
          )}
          {(from || to) && (
            <p className="mt-3 text-sm text-stone-500">
              Valid {from && <>{from} </>}
              {to && <>to {to}</>}
              {deal.page && <> · page {deal.page}</>}
            </p>
          )}
          <div className="mt-5 flex w-full flex-col gap-2">
            {/* Cashiers price match from Flipp, so that's the main way out; the store's own flyer only when Flipp can't show it. */}
            {flipp ? (
              <a href={flipp} target="_blank" rel="noreferrer" className="rounded-2xl bg-sky-500 py-3 font-semibold text-white">
                Show in Flipp for price matching ↗
              </a>
            ) : (
              <a href={flyerUrl(deal.merchant)} target="_blank" rel="noreferrer" className="rounded-2xl bg-green-700 py-3 font-semibold text-white">
                See {deal.merchant}'s flyer ↗
              </a>
            )}
            {action && !picking && (
              <button onClick={action.onClick} className="rounded-2xl py-2 text-sm font-semibold text-stone-600">
                {action.label}
              </button>
            )}
          </div>
          {picking && (
            <div className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 p-2 text-left">
              <p className="px-1 pb-1.5 text-xs font-semibold text-amber-900">
                Other deals <span className="font-normal text-amber-800/70">· tap one to preview it</span>
              </p>
              <div className="space-y-1.5">
                {choices.map((o) => {
                  const on = o.dealId === deal?.dealId
                  return (
                    <button
                      key={o.dealId}
                      onClick={() => setPreview(o.dealId === current?.dealId ? null : o)}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-3 rounded-xl border bg-white p-1.5 text-left ${on ? 'border-orange-400 ring-1 ring-orange-400' : 'border-amber-100'}`}
                    >
                      <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        <FlyerClip deal={o} maxHeight="3rem" sharp={200} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="line-clamp-2 leading-snug">{dealName(o.name)}</span>
                        <span className="block text-stone-500">
                          <span className="font-semibold text-green-700">{o.priceLabel}</span> · {o.merchant}
                          {o.savings > 0 && <span className="text-green-700"> · save {money(o.savings)}</span>}
                        </span>
                      </span>
                      {o.dealId === current?.dealId && <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">Current</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        {picking && (
          <div className="flex gap-2 border-t border-stone-200 p-3">
            <button onClick={onClose} className="flex-1 rounded-2xl border border-stone-300 py-2.5 font-semibold text-stone-700">
              Close
            </button>
            <button
              onClick={() => onChoose(deal)}
              disabled={!swapping}
              className="flex-1 rounded-2xl bg-orange-600 py-2.5 font-semibold text-white disabled:opacity-40"
            >
              Swap
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
