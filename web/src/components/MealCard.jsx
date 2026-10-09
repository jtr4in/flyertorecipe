import { useState } from 'react'
import Sheet from './Sheet'
import { swapOptions } from '../lib/planner'
import { SWAPS } from '../data/recipes'
import { money, shortDay } from '../lib/stores'

const dayLabel = (d) =>
  d.short === 'Today' ? 'Tonight' : d.date.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })

export default function MealCard({ day, nextLeftovers, deals, prefs, swaps, onSwap, onReroll, onMove, onNightOff }) {
  const entry = day.meal
  const { recipe } = entry
  const [swapFor, setSwapFor] = useState(null) // the ingredient line being swapped
  const factor = (prefs.householdSize / recipe.servings) * (entry.batches || 1)
  const today = new Date().toISOString().slice(0, 10)
  const endsIn = entry.endsSoon ? (Date.parse(entry.endsSoon.slice(0, 10)) - Date.parse(today)) / 864e5 : null

  const options = swapFor ? swapOptions(swapFor.ing, SWAPS[swapFor.ing.swappedFrom || swapFor.ing.item] || [], deals, prefs, factor) : []
  const original = swapFor?.ing.swappedFrom

  return (
    <article id={`day-${day.key}`} className="scroll-mt-28 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="flex gap-3 p-4 pb-3">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-amber-50 text-3xl"
          aria-hidden
        >
          {recipe.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-green-700 uppercase">{dayLabel(day)}</p>
          <h3 className="line-clamp-2 text-base leading-snug font-semibold">{recipe.name}</h3>
          <p className="text-xs text-stone-500">
            {recipe.minutes} min · serves {prefs.householdSize}
            {entry.batches === 2 && ' ×2'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold">{money(entry.cost * (entry.batches || 1))}</p>
          <p className="text-[11px] text-stone-500">est. {money(entry.perServing)}/serving</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4">
        {entry.savings > 0 && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
            Saves {money(entry.savings * (entry.batches || 1))}
          </span>
        )}
        {endsIn != null && endsIn <= 3 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
            Sale ends {endsIn <= 0 ? 'today' : shortDay(entry.endsSoon)}
          </span>
        )}
        {nextLeftovers && (
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">
            Cook double · leftovers {nextLeftovers}
          </span>
        )}
      </div>

      <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
        {entry.lines.map((l) => {
          const canSwap = (SWAPS[l.ing.swappedFrom || l.ing.item] || []).length > 0
          return (
            <li key={l.ing.item} className="flex items-center gap-2 px-4 py-2 text-sm">
              <span className={`size-2 shrink-0 rounded-full ${l.deal ? 'bg-green-600' : 'bg-stone-300'}`} aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {l.ing.item}
                {l.ing.swappedFrom && <span className="text-stone-400"> (for {l.ing.swappedFrom})</span>}
                {l.deal && <span className="text-stone-400"> · {l.deal.merchant}</span>}
              </span>
              <span className={`shrink-0 text-xs ${l.deal ? 'font-medium text-stone-800' : 'text-stone-400'}`}>
                {l.deal ? l.deal.priceLabel || l.deal.priceText : 'reg. price'}
              </span>
              {canSwap && (
                <button
                  onClick={() => setSwapFor(l)}
                  className="shrink-0 rounded-full border border-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600"
                  aria-label={`Swap ${l.ing.item}`}
                >
                  ⇄ Swap
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex border-t border-stone-100 text-xs font-medium text-stone-600">
        <button onClick={onReroll} className="flex-1 py-2.5 hover:bg-stone-50">⟳ Different meal</button>
        <button onClick={onMove} className="flex-1 border-x border-stone-100 py-2.5 hover:bg-stone-50">↔ Move day</button>
        <button onClick={onNightOff} className="flex-1 py-2.5 hover:bg-stone-50">🌙 Night off</button>
      </div>

      <Sheet open={!!swapFor} onClose={() => setSwapFor(null)} title={swapFor ? `Swap ${original || swapFor.ing.item}` : ''}>
        <ul className="space-y-2">
          {original && (
            <li>
              <button
                onClick={() => {
                  onSwap(recipe.id, original, null)
                  setSwapFor(null)
                }}
                className="w-full rounded-2xl border border-stone-200 p-3 text-left text-sm"
              >
                Keep the original <span className="font-medium">{original}</span>
              </button>
            </li>
          )}
          {options.map((o) => {
            const current = swapFor && o.alt.item === swapFor.ing.item
            return (
              <li key={o.alt.item}>
                <button
                  disabled={current}
                  onClick={() => {
                    onSwap(recipe.id, original || swapFor.ing.item, o.alt)
                    setSwapFor(null)
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
                    current ? 'border-green-600 bg-green-50' : 'border-stone-200'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {o.alt.item} {current && '✓'}
                    </span>
                    <span className="block truncate text-xs text-stone-500">
                      {o.deal ? `${o.deal.merchant} · ${o.deal.priceLabel || o.deal.priceText}` : 'Not on sale this week'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold">{money(o.cost)}</span>
                    {o.savings > 0 && <span className="block text-[11px] text-green-700">saves {money(o.savings)}</span>}
                  </span>
                </button>
              </li>
            )
          })}
          {swaps?.[original || swapFor?.ing.item] === undefined && options.length === 0 && (
            <li className="text-sm text-stone-500">No swaps for this ingredient yet.</li>
          )}
        </ul>
      </Sheet>
    </article>
  )
}
