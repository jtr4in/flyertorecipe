import { useState } from 'react'
import FlyerProof from './FlyerProof'

const fmtQty = (q, unit) => `${Number.isInteger(q) ? q : q.toFixed(2).replace(/0$/, '')} ${unit}`

export default function ShoppingList({ list }) {
  const [checked, setChecked] = useState({})
  const [proof, setProof] = useState(null)
  if (!list || !list.itemCount) return <p className="text-stone-500">Your list is empty.</p>
  const toggle = (k) => setChecked((c) => ({ ...c, [k]: !c[k] }))

  return (
    <div className="space-y-5">
      <FlyerProof deal={proof} onClose={() => setProof(null)} />
      <p className="text-sm text-stone-600">
        {list.onSale} of {list.itemCount} items are on sale this week. Savings are estimated per pack from flyer
        prices.
      </p>
      {list.aisles.map(({ aisle, items }) => (
        <section key={aisle}>
          <h2 className="mb-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">{aisle}</h2>
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {items.map((it) => {
              const k = `${it.item}|${it.unit}`
              return (
                <li key={k}>
                  <label className="flex items-start gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-green-700"
                      checked={!!checked[k]}
                      onChange={() => toggle(k)}
                    />
                    <span className={`flex-1 ${checked[k] ? 'text-stone-400 line-through' : ''}`}>
                      <span className="font-medium">{it.item}</span>{' '}
                      <span className="text-sm text-stone-500">{fmtQty(it.qty, it.unit)}</span>
                      {it.deal && (
                        <span className="block text-xs text-stone-500">
                          {it.deal.name} · {it.deal.merchant} · {it.deal.priceLabel || it.deal.priceText}
                        </span>
                      )}
                    </span>
                    {it.deal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setProof(it.deal)
                        }}
                        className="shrink-0 rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700"
                      >
                        Flyer
                      </button>
                    )}
                    {it.savings > 0 && (
                      <span className="shrink-0 text-sm font-medium text-green-700">−${it.savings.toFixed(2)}</span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {list.pantry.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">Check your pantry</h2>
          <p className="text-sm text-stone-600">{list.pantry.join(', ')}</p>
        </section>
      )}
    </div>
  )
}
