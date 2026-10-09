// One-page week plan for the fridge: days down the side, meals across, the list underneath.
// "Print / Save as PDF" uses the browser's print dialog; print CSS lives in index.css.
import { createPortal } from 'react-dom'
import { money } from '../lib/stores'

const fmt = (d, opts) => d.toLocaleDateString('en-CA', opts)

function Cell({ entry }) {
  if (!entry || entry.empty) return <span className="text-stone-300">—</span>
  if (entry.off) return <span className="text-stone-300">—</span>
  if (entry.skipped) return <span className="text-stone-400">Skipped</span>
  if (entry.leftovers) return <span className="text-stone-600">🥡 Leftover {entry.leftovers.name.charAt(0).toLowerCase() + entry.leftovers.name.slice(1)}</span>
  return (
    <span>
      <span aria-hidden>{entry.emoji}</span> <span className="font-medium">{entry.name}</span>
      <span className="text-stone-400"> · {entry.minutes}m</span>
    </span>
  )
}

export default function PrintWeek({ plan, list, meals, prefs, onClose }) {
  // Shrink the letter-size preview to fit a phone screen; printing resets it (index.css).
  const zoom = Math.min(1, (window.innerWidth - 16) / (10.3 * 96))
  const first = plan[0]?.date
  const last = plan[plan.length - 1]?.date
  return createPortal(
    <div className="print-sheet fixed inset-0 z-50 overflow-auto bg-stone-200" role="dialog" aria-modal="true" aria-label="Printable week">
      <div className="print-chrome sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-stone-300 bg-white px-4 py-3">
        <p className="text-sm font-semibold">Fridge plan</p>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white">
            Print / PDF
          </button>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-medium text-green-700">
            Done
          </button>
        </div>
      </div>

      <div
        className="print-page mx-auto my-4 w-[10.3in] max-w-none bg-white p-[0.35in] text-[12px] leading-snug text-stone-900 shadow-lg"
        style={{ zoom }}
      >
        <div className="flex items-end justify-between border-b-2 border-green-700 pb-1.5">
          <h1 className="text-xl font-bold text-green-800">
            This week's meals{' '}
            <span className="text-sm font-normal text-stone-500">
              {first && `${fmt(first, { month: 'short', day: 'numeric' })} – ${fmt(last, { month: 'short', day: 'numeric' })}`}
            </span>
          </h1>
          <p className="text-[10px] text-stone-500">
            {prefs.householdSize} people · est. {money(list.totalCost)} · saving {money(list.totalSavings)} with flyer deals
          </p>
        </div>

        <table className="mt-2 w-full table-fixed border-collapse">
          <thead>
            <tr className="text-left text-[10px] tracking-wide text-stone-500 uppercase">
              <th className="w-[0.8in] py-1" />
              {meals.map((m) => (
                <th key={m.id} className="px-1.5 py-1">
                  {m.emoji} {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.map((d) => (
              <tr key={d.key} className="border-t border-stone-200 align-top">
                <td className="py-2 pr-1">
                  <span className="block font-bold">{fmt(d.date, { weekday: 'short' })}</span>
                  <span className="text-stone-500">{fmt(d.date, { month: 'short', day: 'numeric' })}</span>
                </td>
                {meals.map((m) => (
                  <td key={m.id} className="px-1.5 py-2">
                    <Cell entry={d.meals[m.id]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 border-t-2 border-green-700 pt-1.5">
          <p className="text-[10px] font-semibold tracking-wide text-stone-500 uppercase">Grocery list</p>
          <div className="mt-1 columns-4 gap-4">
            {list.groups.map((g) => (
              <div key={g.title} className="mb-1.5 break-inside-avoid">
                <p className="font-semibold text-green-800">{g.title}</p>
                {g.items.map((i) => (
                  <p key={i.key}>
                    ☐ {i.item} <span className="text-stone-500">({i.buy})</span>
                    {i.deal && <span className="text-stone-500"> {i.deal.merchant}</span>}
                  </p>
                ))}
              </div>
            ))}
          </div>
          {list.pantryCheck.length > 0 && (
            <p className="mt-1">
              <span className="font-semibold">Check the pantry:</span>{' '}
              {list.pantryCheck.map((g) => `${g.title}: ${g.items.map((p) => p.item).join(', ')}`).join(' · ')}
            </p>
          )}
          {list.pantry.length > 0 && <p className="mt-0.5 text-stone-500">Staples: {list.pantry.join(', ')}</p>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
