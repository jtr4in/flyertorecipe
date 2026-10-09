import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/** Bottom sheet: slides up over the page, closes on backdrop tap or Escape. */
export default function Sheet({ open, onClose, title, children, footer, tall = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div
        className={`relative flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl ${tall ? 'h-[92dvh]' : 'max-h-[85dvh]'}`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-stone-300" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm font-medium text-green-700">
            Done
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-stone-100 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
