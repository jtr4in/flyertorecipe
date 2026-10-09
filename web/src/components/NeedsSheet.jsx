// "What we need": the household's own shopping list ("salami, cheese, cereal"). Meals are
// planned around the items the recipes can use; the rest go straight on the grocery list.
import { useState } from 'react'
import Sheet from './Sheet'
import { parseNeeds } from '../lib/needs'
import { dealName } from '../lib/stores'

function StatusLine({ s }) {
  if (!s) return null
  if (s.meals.length) {
    return (
      <p className="text-xs text-green-700">
        🍽️ In {s.meals.length} meal{s.meals.length > 1 ? 's' : ''}: {s.meals.join(', ')}
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

export default function NeedsSheet({ open, onClose, needs, status, onChange }) {
  const [text, setText] = useState('')
  const byNeed = new Map(status.map((s) => [s.need, s]))

  const add = (e) => {
    e.preventDefault()
    const more = parseNeeds(text).filter((n) => !needs.includes(n))
    if (more.length) onChange([...needs, ...more])
    setText('')
  }

  return (
    <Sheet open={open} onClose={onClose} title="What do you need?">
      <p className="mb-3 text-sm text-stone-600">
        Add what's running low. We'll pick meals that use those items when they're on sale, and put the rest on your grocery
        list.
      </p>
      <form onSubmit={add} className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="salami, cheese, cereal"
          aria-label="Things you need"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
        />
        <button className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white">Add</button>
      </form>
      {needs.length === 0 ? (
        <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">Nothing yet. Separate items with commas.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {needs.map((n) => (
              <li key={n} className="flex items-start gap-2 rounded-xl border border-stone-200 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize">{n}</p>
                  <StatusLine s={byNeed.get(n)} />
                </div>
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
