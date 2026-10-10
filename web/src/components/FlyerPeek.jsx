// Hover (or tap) a grocery item to see its flyer ad, without leaving the list.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import FlyerClip from './FlyerClip'
import { dealName, shortDay } from '../lib/stores'

const W = 300

/**
 * Wraps a row. Mouse users get the flyer on hover; touch users tap the row to toggle it.
 * Tapping the card itself opens the full-screen flyer (onOpen). `action` ({ label, onClick })
 * adds a button to the card, e.g. "Substitute" for when the store is out of it.
 */
export default function FlyerPeek({ deal, onOpen, action, onRemove, children, className = '' }) {
  const ref = useRef(null)
  const pop = useRef(null)
  const timer = useRef(null)
  const [pos, setPos] = useState(null)
  const hoverable = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.min(Math.max(8, r.left + 12), window.innerWidth - W - 8)
    const below = r.bottom + 6
    const up = below + 300 > window.innerHeight
    setPos({ left, top: up ? undefined : below, bottom: up ? window.innerHeight - r.top + 6 : undefined })
  }
  const hide = () => setPos(null)
  // Hover cards close a moment after the pointer leaves, so it can move onto the card's button.
  const leave = () => (timer.current = setTimeout(hide, 250))
  const stay = () => clearTimeout(timer.current)

  // Close on scroll or a tap elsewhere.
  useEffect(() => {
    if (!pos) return
    const close = (e) => {
      if (e.type === 'scroll' || !(ref.current?.contains(e.target) || pop.current?.contains(e.target))) hide()
    }
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('scroll', close, true)
    }
  }, [pos])

  if (!deal) return <div className={className}>{children}</div>
  return (
    <div
      ref={ref}
      className={`cursor-pointer ${className}`}
      onMouseEnter={hoverable ? () => (stay(), show()) : undefined}
      onMouseLeave={hoverable ? leave : undefined}
      onClick={() => (hoverable ? onOpen?.(deal) : pos ? hide() : show())}
    >
      {children}
      {pos &&
        createPortal(
          <div
            className={`fixed z-[60] ${hoverable && !action && !onRemove ? 'pointer-events-none' : ''} overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl`}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: W }}
            ref={pop}
            onMouseEnter={hoverable ? stay : undefined}
            onMouseLeave={hoverable ? leave : undefined}
            onClick={(e) => {
              e.stopPropagation()
              hide()
              onOpen?.(deal)
            }}
            role="tooltip"
          >
            <div className="relative bg-stone-50">
              <FlyerClip deal={deal} maxHeight="14rem" />
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    hide()
                    onRemove()
                  }}
                  aria-label="Remove from list"
                  title="Remove from list"
                  className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-sm text-stone-600 shadow hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="border-t border-stone-100 px-3 py-2 text-xs">
              <p className="font-semibold">{deal.merchant}</p>
              <p className="line-clamp-2 text-stone-600">{dealName(deal.name)}</p>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <p className="mt-1 text-base font-bold text-green-700">{deal.priceLabel || deal.priceText}</p>
                  {deal.saleStory && <p className="text-stone-500">{deal.saleStory}</p>}
                  {deal.validTo && <p className="mt-1 text-stone-400">Until {shortDay(deal.validTo)}</p>}
                </div>
                {action && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      hide()
                      action.onClick()
                    }}
                    className="shrink-0 rounded-xl border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    {action.label}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
