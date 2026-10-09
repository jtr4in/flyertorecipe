// The pieces of the "Build my week" quiz, shared by first-run setup and the Build my week button.
import { MEALS } from '../data/templates'
import { LIKE_GROUPS } from '../lib/likes'

const DAYS = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [0, 'Sun'],
]

/** The saved schedule, or every chosen meal on every day when there isn't one yet. */
export function fullSchedule(prefs) {
  if (prefs.schedule) return prefs.schedule
  const meals = prefs.meals || MEALS.map((m) => m.id)
  return Object.fromEntries(DAYS.map(([d]) => [d, [...meals]]))
}

/** Prefs with a new schedule; `meals` becomes every meal that's on it at least once. */
export function withSchedule(prefs, schedule) {
  const meals = MEALS.map((m) => m.id).filter((id) => Object.values(schedule).some((list) => list.includes(id)))
  return { ...prefs, schedule, meals }
}

export const scheduleCount = (schedule) => Object.values(schedule).reduce((a, l) => a + l.length, 0)

/** Days down the side, meals across the top. Tap a cell, or a meal's heading for the whole week. */
export function ScheduleGrid({ schedule, onChange }) {
  const has = (d, m) => (schedule[d] || []).includes(m)
  const set = (d, m, on) => ({ ...schedule, [d]: MEALS.map((x) => x.id).filter((id) => (id === m ? on : has(d, id))) })
  const toggleCell = (d, m) => onChange(set(d, m, !has(d, m)))
  const toggleColumn = (m) => {
    const on = !DAYS.every(([d]) => has(d, m))
    onChange(DAYS.reduce((s, [d]) => ({ ...s, [d]: MEALS.map((x) => x.id).filter((id) => (id === m ? on : (s[d] || []).includes(id))) }), schedule))
  }
  return (
    <table className="w-full table-fixed border-separate border-spacing-1.5 text-sm">
      <thead>
        <tr>
          <th className="w-12" />
          {MEALS.map((m) => (
            <th key={m.id} className="font-normal">
              <button type="button" onClick={() => toggleColumn(m.id)} className="w-full rounded-xl py-1 text-xs text-stone-600" aria-label={`${m.label} every day`}>
                <span className="block text-lg" aria-hidden>
                  {m.emoji}
                </span>
                {m.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DAYS.map(([d, label]) => (
          <tr key={d}>
            <th className="text-left text-xs font-medium text-stone-600">{label}</th>
            {MEALS.map((m) => {
              const on = has(d, m.id)
              return (
                <td key={m.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${label} ${m.label}`}
                    onClick={() => toggleCell(d, m.id)}
                    className={`flex h-10 w-full items-center justify-center rounded-xl border text-base font-semibold ${
                      on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-200 bg-white text-stone-300'
                    }`}
                  >
                    {on ? '✓' : ''}
                  </button>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Big tappable chips for one kind of food. Nothing picked means "anything is fine". */
export function LikesPicker({ group, picked, onChange }) {
  const g = LIKE_GROUPS.find((x) => x.id === group)
  const toggle = (id) => onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])
  const allOn = picked.length === g.options.length
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {g.options.map((o) => {
          const on = picked.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.id)}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium ${
                on ? 'border-green-700 bg-green-50 text-green-900 ring-1 ring-green-700' : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              <span className="text-xl" aria-hidden>
                {o.emoji}
              </span>
              {o.label}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={() => onChange(allOn ? [] : g.options.map((o) => o.id))} className="mt-3 text-sm font-medium text-green-700">
        {allOn ? 'Clear all' : 'Select all'}
      </button>
    </div>
  )
}

/** The quiz screens after household setup: schedule, then each kind of food. */
export function planScreens(draft, setDraft) {
  return [
    {
      title: 'When do you need meals?',
      hint: 'Tick the meals to plan on each day. Tap a meal at the top to set the whole week.',
      body: <ScheduleGrid schedule={draft.schedule} onChange={(schedule) => setDraft({ ...draft, schedule })} />,
      ok: scheduleCount(draft.schedule) > 0,
    },
    ...LIKE_GROUPS.map((g) => {
      const picked = draft.likes?.[g.id] || []
      return {
        title: g.title,
        hint: g.hint,
        body: <LikesPicker group={g.id} picked={picked} onChange={(next) => setDraft({ ...draft, likes: { ...draft.likes, [g.id]: next } })} />,
        next: picked.length ? 'Next' : 'Anything is fine',
      }
    }),
  ]
}
