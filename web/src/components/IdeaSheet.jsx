import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { MEAL_NUDGES, NUDGES, suggestMeals } from '../lib/planner'
import { money, storeTint } from '../lib/stores'

const PAGE = 3

/**
 * "Change meal": a few on-sale alternatives at a time, with nudges like Healthier or Sweet.
 * The new dish can go on just this day, on the other days with the same dish, or on every day
 * for this meal, so the list buys one set of ingredients instead of a bit of everything.
 */
export default function IdeaSheet({ current, deals, prefs, plan, onPick, onClose }) {
  const [nudge, setNudge] = useState(null)
  const [page, setPage] = useState(0)
  const [scope, setScope] = useState('one') // 'one' | 'repeats' | 'all'

  // Other days with this same dish.
  const repeats = useMemo(
    () =>
      current?.template
        ? plan
            .map((d) => ({ day: d, m: d.meals[current.meal] }))
            .filter(({ m }) => m?.lines && m.key !== current.key && m.template.id === current.template.id)
        : [],
    [current, plan],
  )
  // Every other day this meal is cooked (not skipped, not leftovers).
  const others = useMemo(
    () => (current ? plan.map((d) => d.meals[current.meal]).filter((m) => m?.lines && m.key !== current.key) : []),
    [current, plan],
  )
  useEffect(() => {
    setNudge(null)
    setPage(0)
    setScope(repeats.length ? 'repeats' : 'one')
  }, [current?.key])
  const alsoKeys = scope === 'all' ? others.map((m) => m.key) : scope === 'repeats' ? repeats.map(({ m }) => m.key) : []
  const day = current && plan.find((d) => d.meals[current.meal]?.key === current.key)
  const meal = current?.meal
  const scopes = [
    ['one', `Just ${day?.short === 'Today' ? 'today' : day?.short || 'this day'}`],
    ['repeats', repeats.length ? `Everywhere this dish is planned (${repeats.length + 1} days)` : 'Everywhere this dish is planned (only today)'],
    others.length > 0 && ['all', `Every ${meal} this week`],
  ].filter(Boolean)

  const ideas = useMemo(
    () => (current ? suggestMeals(current, deals, prefs, { nudge, plan }) : []),
    [current, deals, prefs, nudge, plan],
  )
  const pages = Math.max(1, Math.ceil(ideas.length / PAGE))
  const shown = ideas.slice((page % pages) * PAGE, (page % pages) * PAGE + PAGE)

  return (
    <Sheet open={!!current} onClose={onClose} title={current ? `Change ${current.meal}` : ''}>
      {current && (
        <>
          {scopes.length > 1 && (
            <fieldset className="mb-4 rounded-2xl bg-amber-50 p-3">
              <legend className="sr-only">Where to use it</legend>
              <p className="text-sm font-medium">Use the new dish for…</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {scopes.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={scope === id}
                    disabled={id === 'repeats' && !repeats.length}
                    onClick={() => setScope(id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:border-stone-200 disabled:text-stone-400 ${
                      scope === id ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-stone-600">
                {scope === 'all'
                  ? `Same ${meal} all week, so you buy one set of ingredients in bulk instead of a bit of everything.`
                  : scope === 'repeats'
                    ? `${current.name} is also planned ${repeats.map(({ day: d }) => d.short).join(', ')}. Changing them all keeps you from buying for both dishes.`
                    : 'Only this one changes.'}
              </p>
            </fieldset>
          )}
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
                      onClick={() => onPick(m, alsoKeys)}
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
