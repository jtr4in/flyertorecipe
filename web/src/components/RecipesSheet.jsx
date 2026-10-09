// Browse recipes: every dish for a meal, made with this week's deals, and add any of them to a day.
import { useMemo, useState } from 'react'
import Sheet from './Sheet'
import { MEALS } from '../data/templates'
import { cookedMeals, suggestMeals } from '../lib/planner'
import { LIKE_GROUPS } from '../lib/likes'
import { money } from '../lib/stores'

const PROTEINS = LIKE_GROUPS.find((g) => g.id === 'protein').options

function RecipeCard({ idea, planned, days, onAdd }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-3 p-3 text-left">
        <span className="text-2xl" aria-hidden>
          {idea.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug">{idea.name}</span>
          <span className="mt-0.5 block text-xs text-stone-500">
            {idea.minutes} min · {money(idea.cost / idea.servings)}/serving ·{' '}
            <span className="text-green-700">
              {idea.onSale}/{idea.lines.length} on sale
            </span>
          </span>
          {planned.length > 0 && (
            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
              In your plan: {planned.join(', ')}
            </span>
          )}
        </span>
        <span className="text-stone-400" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-3 pb-3">
          <ul className="mt-2 space-y-0.5 text-xs text-stone-600">
            {idea.lines.map((l) => (
              <li key={l.slot}>
                {l.ing.item}
                {l.deal && (
                  <span className="text-green-700">
                    {' '}
                    · {l.deal.priceLabel || l.deal.priceText} at {l.deal.merchant}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-medium text-stone-700">Add it to…</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {days.map((d) => (
              <button
                key={d.key}
                onClick={() => onAdd(idea, d)}
                className="rounded-full border border-green-700 px-3 py-1 text-xs font-medium text-green-800"
                title={d.current ? `Replaces ${d.current}` : undefined}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  )
}

export default function RecipesSheet({ open, onClose, deals, prefs, plan, onAdd }) {
  const [meal, setMeal] = useState('dinner')
  const [protein, setProtein] = useState(null)
  const [q, setQ] = useState('')

  const ideas = useMemo(() => {
    if (!open) return []
    const current = { meal, name: '', key: null, servings: prefs.householdSize || 2, template: {} }
    return suggestMeals(current, deals, prefs, { plan })
  }, [open, meal, deals, prefs, plan])

  const plannedOn = useMemo(() => {
    const m = new Map()
    for (const d of plan) for (const e of cookedMeals([d])) if (e.meal === meal) m.set(e.name, [...(m.get(e.name) || []), d.short])
    return m
  }, [plan, meal])

  const chip = PROTEINS.find((p) => p.id === protein)
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = ideas.filter(
    (m) =>
      (!chip || m.lines.some((l) => chip.items.includes(l.ing.item))) &&
      words.every((w) => m.name.toLowerCase().includes(w) || m.lines.some((l) => l.ing.item.includes(w))),
  )
  const days = plan.map((d) => ({ key: d.key, short: d.short, current: d.meals[meal]?.name }))
  const proteinChips = meal === 'lunch' || meal === 'dinner'

  return (
    <Sheet open={open} onClose={onClose} title="Recipes" tall>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1" role="tablist">
        {MEALS.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={meal === m.id}
            onClick={() => {
              setMeal(m.id)
              setProtein(null)
            }}
            className={`rounded-lg py-1.5 text-xs font-medium ${meal === m.id ? 'bg-white shadow-sm' : 'text-stone-600'}`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search recipes or ingredients"
        aria-label="Search recipes"
        className="mb-3 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
      />
      {proteinChips && (
        <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {PROTEINS.map((p) => (
            <button
              key={p.id}
              aria-pressed={protein === p.id}
              onClick={() => setProtein(protein === p.id ? null : p.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                protein === p.id ? 'border-green-700 bg-green-700 text-white' : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      )}
      <p className="mb-2 text-xs text-stone-500">
        {shown.length} {shown.length === 1 ? 'recipe' : 'recipes'}, most on sale first. Tap one to add it to a day.
      </p>
      {shown.length === 0 ? (
        <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">No recipes match. Try another filter.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((idea) => (
            <RecipeCard key={idea.name} idea={idea} planned={plannedOn.get(idea.name) || []} days={days} onAdd={onAdd} />
          ))}
        </ul>
      )}
    </Sheet>
  )
}
