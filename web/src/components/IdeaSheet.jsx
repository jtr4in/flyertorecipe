import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { MEAL_NUDGES, NUDGES, suggestMeals } from '../lib/planner'
import { money, storeTint } from '../lib/stores'

const PAGE = 3

/** "Another idea": a few on-sale alternatives at a time, with nudges like Healthier or Sweet. */
export default function IdeaSheet({ current, deals, prefs, plan, onPick, onClose }) {
  const [nudge, setNudge] = useState(null)
  const [page, setPage] = useState(0)
  useEffect(() => {
    setNudge(null)
    setPage(0)
  }, [current?.key])

  const ideas = useMemo(
    () => (current ? suggestMeals(current, deals, prefs, { nudge, plan }) : []),
    [current, deals, prefs, nudge, plan],
  )
  const pages = Math.max(1, Math.ceil(ideas.length / PAGE))
  const shown = ideas.slice((page % pages) * PAGE, (page % pages) * PAGE + PAGE)

  return (
    <Sheet open={!!current} onClose={onClose} title={current ? `Another ${current.meal} idea` : ''}>
      {current && (
        <>
          <p className="mb-2 text-xs text-stone-500">In the mood for something…</p>
          <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
            {MEAL_NUDGES[current.meal].map((id) => {
              const n = NUDGES[id]
              const on = nudge === id
              return (
                <button
                  key={id}
                  aria-pressed={on}
                  onClick={() => {
                    setNudge(on ? null : id)
                    setPage(0)
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  {n.emoji} {n.label}
                </button>
              )
            })}
          </div>

          {shown.length === 0 ? (
            <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">
              Nothing on sale fits that this week. Try another nudge.
            </p>
          ) : (
            <ul className="space-y-2">
              {shown.map((m) => {
                const stores = [...new Set(m.lines.filter((l) => l.deal).map((l) => l.deal.merchant))]
                return (
                  <li key={m.name}>
                    <button
                      onClick={() => onPick(m)}
                      className="flex w-full items-start gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left hover:border-green-600"
                    >
                      <span className="text-2xl" aria-hidden>
                        {m.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug font-semibold">{m.name}</span>
                        <span className="block text-xs text-stone-500">
                          {m.minutes} min · {money(m.cost / m.servings)}/serving ·{' '}
                          <span className={m.regular ? 'text-stone-500' : 'text-green-700'}>
                            {m.onSale}/{m.lines.length} on sale
                          </span>
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {stores.map((s) => (
                            <span key={s} className={`rounded-full px-1.5 text-[10px] font-medium ${storeTint(s)}`}>
                              {s}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {pages > 1 && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="mt-3 w-full rounded-2xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-green-700"
            >
              ⟳ More ideas ({(page % pages) + 1}/{pages})
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}
