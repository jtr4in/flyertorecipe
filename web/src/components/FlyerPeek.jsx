// Hover (or tap) a grocery item to see its flyer ad, without leaving the list.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dealName, shortDay } from '../lib/stores'

const W = 260

/**
 * Wraps a row. Mouse users get the flyer on hover; touch users tap the row to toggle it.
 * Tapping the card itself opens the full-screen flyer (onOpen).
 */
export default function FlyerPeek({ deal, onOpen, children, className = '' }) {
  const ref = useRef(null)
  const pop = useRef(null)
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
      onMouseEnter={hoverable ? show : undefined}
      onMouseLeave={hoverable ? hide : undefined}
      onClick={() => (hoverable ? onOpen?.(deal) : pos ? hide() : show())}
    >
      {children}
      {pos &&
        createPortal(
          <div
            className={`fixed z-[60] ${hoverable ? 'pointer-events-none' : ''} overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl`}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: W }}
            ref={pop}
            onClick={(e) => {
              e.stopPropagation()
              hide()
              onOpen?.(deal)
            }}
            role="tooltip"
          >
            {deal.imageUrl ? (
              <img src={deal.imageUrl} alt="" className="h-40 w-full bg-stone-50 object-contain p-2" />
            ) : (
              <p className="bg-stone-50 p-6 text-center text-xs text-stone-400">No flyer image</p>
            )}
            <div className="border-t border-stone-100 px-3 py-2 text-xs">
              <p className="font-semibold">{deal.merchant}</p>
              <p className="line-clamp-2 text-stone-600">{dealName(deal.name)}</p>
              <p className="mt-1 text-base font-bold text-green-700">{deal.priceLabel || deal.priceText}</p>
              {deal.saleStory && <p className="text-stone-500">{deal.saleStory}</p>}
              {deal.validTo && <p className="mt-1 text-stone-400">Until {shortDay(deal.validTo)}</p>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
