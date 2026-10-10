// Guided tour of the main screen: dims the page, spotlights one element at a time
// (found by its data-tour attribute) and explains it in a card beside it.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const TOUR_STEPS = [
  {
    target: 'household',
    title: 'Your household',
    body: 'Your area, the stores you shop at, and how many people you feed. Tap here any time to change them.',
  },
  {
    target: 'tabs',
    title: 'Plan at home, then shop',
    body: 'Plan is where you pick dinners. Shop is just the grocery checklist, sorted by aisle, for when you\'re in the store.',
  },
  {
    target: 'heroes',
    title: 'Start with the protein',
    body: 'These are the week\'s best meat and protein deals. Tap one or two, and we\'ll suggest dinners built around them from everything else on sale.',
  },
  {
    target: 'pool',
    title: 'Your 3–4 dinners',
    body: 'No days to stick to. Cook them in any order, swap one for another dish, or make extra for lunch. Then tap Generate my list.',
  },
  {
    target: 'plan',
    title: 'What do you need?',
    body: 'Add things you need this week, like "salami, cheese, cereal". Meals get planned around them, and the rest go straight on the grocery list.',
  },
  {
    target: 'deals',
    title: 'Other deals',
    body: 'Frozen meals, paper towels, coffee, diapers and more from the flyers. Add any to your list, or watch the things you always buy.',
  },
  {
    target: 'list',
    title: 'Your grocery list',
    body: 'Everything for the week, sorted by aisle. "Price Matching" shows every flyer ad so you can get all the deals at one store.',
  },
]

const PAD = 6
// Rounded-rectangle subpath, cut out of the dimmed layer by the even-odd fill rule.
const hole = (x, y, w, h, r) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
const find = (target) => document.querySelector(`[data-tour="${target}"]`)

export default function Tour({ open, onClose, steps = TOUR_STEPS }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const card = useRef(null)
  const [cardH, setCardH] = useState(180)

  // Only the steps whose element is on screen right now (e.g. no list bar on an empty week).
  const [live, setLive] = useState(steps)
  useEffect(() => {
    if (!open) return
    setLive(steps.filter((s) => find(s.target)))
    setI(0)
  }, [open, steps])
  const step = live[i]

  const measure = useCallback(() => {
    const el = step && find(step.target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  useLayoutEffect(() => {
    if (!open || !step) return
    const el = find(step.target)
    if (!el) return
    const r = el.getBoundingClientRect()
    const fixed = getComputedStyle(el.closest('header, .fixed') || el).position
    if (fixed !== 'fixed' && fixed !== 'sticky' && (r.top < 90 || r.bottom > window.innerHeight - 260)) {
      window.scrollTo({ top: window.scrollY + r.top - Math.max(100, (window.innerHeight - r.height) / 3), behavior: 'instant' })
    }
    measure()
  }, [open, step, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, live.length - 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, measure, onClose, live.length])

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight)
  }, [step, rect])

  if (!open || !step) return null
  const last = i === live.length - 1
  const vh = window.innerHeight
  const vw = window.innerWidth

  // Card goes below the spotlight if it fits, else above, else pinned to the bottom.
  let cardTop
  if (rect && rect.bottom + PAD + 12 + cardH < vh - 8) cardTop = rect.bottom + PAD + 12
  else if (rect && rect.top - PAD - 12 - cardH > 8) cardTop = rect.top - PAD - 12 - cardH
  else cardTop = vh - cardH - 16
  const width = Math.min(340, vw - 32)
  const center = rect ? rect.left + rect.width / 2 : vw / 2
  const left = Math.max(16, Math.min(vw - width - 16, center - width / 2))

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="App tour">
      {/* Blocks taps on the page underneath; the spotlight's shadow does the dimming. */}
      <div className="absolute inset-0" onClick={() => (last ? onClose() : setI(i + 1))} />
      {/* Dim everything except a rounded hole around the element. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <path
          fillRule="evenodd"
          fill="rgba(28,25,23,0.66)"
          d={`M0 0H${vw}V${vh}H0Z${rect ? hole(rect.left - PAD, rect.top - PAD, rect.width + PAD * 2, rect.height + PAD * 2, 16) : ''}`}
        />
        {rect && (
          <rect x={rect.left - PAD} y={rect.top - PAD} width={rect.width + PAD * 2} height={rect.height + PAD * 2} rx="16" fill="none" stroke="#fff" strokeWidth="3" />
        )}
      </svg>
      <div
        ref={card}
        className="absolute rounded-2xl bg-white p-4 shadow-2xl transition-[top,left] duration-300"
        style={{ top: cardTop, left, width }}
      >
        <p className="text-[11px] font-medium text-green-700">
          {i + 1} of {live.length}
        </p>
        <h2 className="mt-0.5 text-base font-semibold">{step.title}</h2>
        <p className="mt-1 text-sm text-stone-600">{step.body}</p>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={onClose} className="text-xs font-medium text-stone-500">
            Skip tour
          </button>
          <span className="flex-1" />
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="rounded-xl px-3 py-2 text-sm font-medium text-stone-600">
              Back
            </button>
          )}
          <button
            onClick={() => (last ? onClose() : setI(i + 1))}
            className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white"
          >
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
