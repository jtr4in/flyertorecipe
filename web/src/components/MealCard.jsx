import FlyerPeek from './FlyerPeek'
import { dealName, money, storeTint } from '../lib/stores'
import { cap } from '../data/templates'

const fmtQty = (q, unit) => {
  const n = Number.isInteger(q) ? q : Math.round(q * 4) / 4
  return unit === 'each' ? `${n}` : `${n} ${unit}`
}

/**
 * One meal slot of the selected day (breakfast, lunch, dinner or snack).
 * Tap an ingredient to swap it for something else on sale; "Another idea" re-rolls the dish.
 */
export default function MealCard({ label, emoji, entry, onSwapLine, onAnother, onSkip, onRestore, onCook, onProof }) {
  const head = (
    <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
      <span aria-hidden>{emoji}</span> {label}
    </p>
  )

  if (!entry) return null
  if (entry.skipped || entry.empty) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-4 py-3">
        <div className="flex-1">
          {head}
          <p className="text-sm text-stone-500">{entry.skipped ? 'Not planning this one' : 'Nothing on sale fits your filters'}</p>
        </div>
        {entry.skipped && (
          <button onClick={onRestore} className="text-sm font-medium text-green-700">
            + Plan it
          </button>
        )}
      </div>
    )
  }

  if (entry.leftovers) {
    const m = entry.leftovers
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="text-2xl" aria-hidden>
          🥡
        </span>
        <div className="min-w-0 flex-1">
          {head}
          <p className="truncate text-sm font-medium">Leftover {m.name.charAt(0).toLowerCase() + m.name.slice(1)}</p>
          <p className="text-xs text-amber-800">Cooked double last night · $0 extra</p>
        </div>
        <button onClick={onCook} className="shrink-0 text-xs font-medium text-stone-500">
          Make lunch
        </button>
      </div>
    )
  }

  const m = entry
  const perServing = m.cost / m.servings
  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-4 pt-3">
        <span className="mt-4 text-3xl" aria-hidden>
          {m.emoji}
        </span>
        <div className="min-w-0 flex-1">
          {head}
          <h3 className="text-base leading-snug font-semibold">{m.name}</h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {m.minutes} min · {money(perServing)}/serving
            {m.batches > 1 && <span className="text-amber-700"> · makes {m.leftoversFor}'s lunch too</span>}
          </p>
        </div>
        {m.savings > 0.05 && (
          <span className="mt-1 shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
            −{money(m.savings * (m.batches || 1))}
          </span>
        )}
      </div>

      <ul className="mt-2 px-2">
        {m.lines.map((l) => (
          <li key={l.slot}>
            <FlyerPeek deal={l.deal} onOpen={onProof} className="rounded-xl">
              <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-stone-50">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{cap(l.ing.item)}</span>{' '}
                  <span className="text-stone-400">{fmtQty(l.qty * (m.batches || 1), l.ing.unit)}</span>
                  {l.deal && <span className="block truncate text-[11px] text-stone-400">{dealName(l.deal.name)}</span>}
                </span>
                {l.deal ? (
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-green-700">{l.deal.priceLabel}</span>
                    <span className={`inline-block rounded-full px-1.5 text-[10px] font-medium ${storeTint(l.deal.merchant)}`}>
                      {l.deal.merchant}
                    </span>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-stone-400">reg. price</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSwapLine(l)
                  }}
                  aria-label={`Swap ${l.ing.item}`}
                  className="shrink-0 rounded-lg px-1.5 py-1 text-stone-400 hover:bg-stone-100 hover:text-green-700"
                >
                  ⇄
                </button>
              </div>
            </FlyerPeek>
          </li>
        ))}
      </ul>
      {m.pantry.length > 0 && <p className="px-4 pt-1 text-[11px] text-stone-400">You have: {m.pantry.join(', ')}</p>}

      <div className="mt-2 flex border-t border-stone-100 text-xs font-medium">
        <button onClick={onAnother} className="flex-1 py-2.5 text-green-700 hover:bg-stone-50">
          ⟳ Another idea
        </button>
        <button onClick={onSkip} className="flex-1 border-l border-stone-100 py-2.5 text-stone-500 hover:bg-stone-50">
          Skip
        </button>
      </div>
    </article>
  )
}
