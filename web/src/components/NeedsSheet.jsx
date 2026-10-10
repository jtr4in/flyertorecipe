// "What we need": everyday restocks ("milk, bread, coffee") added to the grocery list beside the
// dinners. Anything a dinner already uses is shown under that meal instead of twice.
import { useMemo, useRef, useState } from 'react'
import Sheet from './Sheet'
import FlyerClip from './FlyerClip'
import { parseNeeds, suggestNeeds } from '../lib/needs'
import { dealName } from '../lib/stores'

function StatusLine({ s }) {
  if (!s) return null
  if (s.meals.length) {
    return (
      <p className="text-xs text-green-700">
        🍽️ In {s.meals.length} meal{s.meals.length > 1 ? 's' : ''}: {s.meals.slice(0, 3).join(', ')}
        {s.meals.length > 3 && ` and ${s.meals.length - 3} more`}
      </p>
    )
  }
  if (s.deal) {
    return (
      <p className="text-xs text-green-700">
        🛒 On your list · on sale at {s.deal.merchant} {s.deal.priceLabel || s.deal.priceText} ({dealName(s.deal.name)})
      </p>
    )
  }
  return <p className="text-xs text-stone-500">🛒 On your list (not in this week's flyers)</p>
}

// One-tap restocks for the empty search box: the things households run out of every week.
const COMMON = ['milk', 'eggs', 'bread', 'butter', 'cheese', 'yogurt', 'coffee', 'cereal', 'bananas', 'toilet paper']

export default function NeedsSheet({ open, onClose, needs, status, onChange, deals = [], onOptions, onProof }) {
  const [text, setText] = useState('')
  const input = useRef(null)
  const picks = useMemo(() => suggestNeeds(text, deals, needs), [text, deals, needs])
  const quick = COMMON.filter((q) => !needs.includes(q))
  const byNeed = new Map(status.map((s) => [s.need, s]))

  const commit = () => {
    const more = parseNeeds(text).filter((n) => !needs.includes(n))
    if (more.length) onChange([...needs, ...more])
    setText('')
  }
  const add = (e) => {
    e.preventDefault()
    commit()
  }
  // Closing keeps what was typed but not added yet: phones often have no obvious "Add" step.
  const close = () => {
    commit()
    onClose()
  }

  // Tapping a suggestion adds it, plus anything typed before the last comma.
  const pick = (need) => {
    const before = parseNeeds(text.split(/[,\n;]+/).slice(0, -1).join(','))
    onChange([...needs, ...[...before, need].filter((n, i, all) => !needs.includes(n) && all.indexOf(n) === i)])
    setText('')
    input.current?.focus()
  }

  return (
    <Sheet open={open} onClose={close} title="What do you need?" tall>
      <p className="mb-3 text-sm text-stone-600">
        Add anything else you're out of. It goes on your list with this week's best flyer price, and anything your dinners
        already use won't be added twice.
      </p>
      <form onSubmit={add} className="mb-4 flex gap-2">
        <input
          ref={input}
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="milk, bread, coffee"
          aria-label="Things you need"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
        />
        <button className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white">Add</button>
      </form>
      {picks.length > 0 && (
        <ul role="listbox" aria-label="Suggestions" className="-mt-2 mb-4 max-h-[55dvh] divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          {picks.map(({ need, deal }) => (
            <li key={need}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => pick(need)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-stone-50"
              >
                {deal && (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-50">
                    {deal.imageUrl ? (
                      <img src={deal.imageUrl} alt="" loading="lazy" className="max-h-12 max-w-12 object-contain" />
                    ) : deal.clip?.box ? (
                      <FlyerClip deal={deal} sharp={160} maxHeight="3rem" />
                    ) : (
                      <span aria-hidden>🏷️</span>
                    )}
                  </span>
                )}
                <span className="line-clamp-2 min-w-0 flex-1 text-sm">
                  {deal ? dealName(deal.name) : <span className="font-medium"><span className="capitalize">{need}</span> <span className="font-normal text-stone-400">(any kind)</span></span>}
                </span>
                {deal && (
                  <span className="shrink-0 text-right text-xs">
                    <span className="block font-semibold text-green-700">{deal.priceLabel || deal.priceText}</span>
                    <span className="block text-stone-500">{deal.merchant}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!text.trim() && quick.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Common</p>
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onChange([...needs, q])}
                className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm capitalize"
              >
                + {q}
              </button>
            ))}
          </div>
        </div>
      )}
      {needs.length === 0 ? (
        <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">Nothing yet. Tap a common item or type your own, separated by commas.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {needs.map((n) => (
              <li key={n} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2">
                {byNeed.get(n)?.deal && onProof && (
                  <button
                    onClick={() => onProof(byNeed.get(n).deal, n)}
                    aria-label={`See the flyer for ${n}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-50"
                  >
                    {byNeed.get(n).deal.imageUrl ? (
                      <img src={byNeed.get(n).deal.imageUrl} alt="" className="max-h-10 max-w-10 object-contain" />
                    ) : (
                      <FlyerClip deal={byNeed.get(n).deal} sharp={120} maxHeight="2.5rem" />
                    )}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize">{n}</p>
                  <StatusLine s={byNeed.get(n)} />
                </div>
                {onOptions && (
                  <button onClick={() => onOptions(n)} className="shrink-0 rounded-lg px-1.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50">
                    Options
                  </button>
                )}
                <button onClick={() => onChange(needs.filter((x) => x !== n))} className="px-1 text-stone-400" aria-label={`Remove ${n}`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => onChange([])} className="mt-3 text-sm text-stone-500 underline">
            Clear all
          </button>
        </>
      )}
    </Sheet>
  )
}
