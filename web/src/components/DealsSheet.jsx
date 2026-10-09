// "Other deals": flyer deals beyond the recipes (frozen meals, paper towels, coffee, diapers),
// a watch list for things the household always buys, and + Add to put them on the grocery list.
import { useMemo, useState } from 'react'
import Sheet from './Sheet'
import FlyerClip from './FlyerClip'
import { EXTRA_CATEGORIES, extraDeals, watchMatches, categorize } from '../lib/extras'
import { dealName, storeTint } from '../lib/stores'

function DealTile({ deal, added, onToggle, onProof }) {
  return (
    <div className="mb-2 break-inside-avoid overflow-hidden rounded-xl border border-stone-200 bg-white">
      {(deal.clip?.box || deal.imageUrl) && (
        <button onClick={() => onProof(deal)} className="block w-full text-left" aria-label={`See the flyer ad for ${dealName(deal.name)}`}>
          <FlyerClip deal={deal} sharp={480} maxHeight="11rem" />
        </button>
      )}
      <div className="border-t border-stone-100 px-2 py-1.5">
        <p className="line-clamp-2 text-[12px] leading-snug">{dealName(deal.name)}</p>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="text-sm font-bold text-green-700">{deal.priceLabel || deal.priceText}</span>
          <span className={`truncate rounded-full px-1.5 text-[10px] font-medium ${storeTint(deal.merchant)}`}>{deal.merchant}</span>
        </div>
        <button
          onClick={() => onToggle(deal)}
          aria-pressed={added}
          className={`mt-1.5 w-full rounded-lg py-1.5 text-xs font-semibold ${added ? 'bg-green-100 text-green-800' : 'bg-green-700 text-white'}`}
        >
          {added ? '✓ On your list' : '+ Add to list'}
        </button>
      </div>
    </div>
  )
}

export default function DealsSheet({ open, onClose, deals, extras, onToggle, watch, onWatch, onProof }) {
  const [cat, setCat] = useState('all')
  const [term, setTerm] = useState('')
  const all = useMemo(() => extraDeals(deals), [deals])
  const watched = useMemo(() => watchMatches(deals, watch), [deals, watch])
  const addedIds = new Set(extras.map((x) => x.deal.dealId))
  const shown = cat === 'all' ? all : all.filter((x) => x.category === cat)
  const counts = Object.fromEntries(EXTRA_CATEGORIES.map((c) => [c.id, all.filter((x) => x.category === c.id).length]))
  const toggle = (deal) => onToggle(deal, categorize(deal))

  const addWatch = (e) => {
    e.preventDefault()
    const t = term.trim().toLowerCase()
    if (t && !watch.includes(t)) onWatch([...watch, t])
    setTerm('')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Other deals" tall>
      <section className="mb-5 rounded-2xl bg-amber-50 p-3">
        <h3 className="text-sm font-semibold">⭐ Things you always buy</h3>
        <p className="text-xs text-stone-600">Add them once and we'll show them here whenever they're on sale.</p>
        <form onSubmit={addWatch} className="mt-2 flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="e.g. toilet paper, diapers, coffee"
            className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
          />
          <button className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white">Watch</button>
        </form>
        {watched.length > 0 && (
          <div className="mt-3 space-y-3">
            {watched.map(({ term: t, deals: ds }) => (
              <div key={t}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {t}{' '}
                    <span className={ds.length ? 'text-green-700' : 'text-stone-400'}>
                      · {ds.length ? `${ds.length} on sale` : 'not on sale this week'}
                    </span>
                  </p>
                  <button onClick={() => onWatch(watch.filter((x) => x !== t))} className="text-xs text-stone-500" aria-label={`Stop watching ${t}`}>
                    Remove
                  </button>
                </div>
                {ds.length > 0 && (
                  <div className="-mx-3 mt-1.5 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
                    {ds.slice(0, 12).map((d) => (
                      <div key={d.dealId} className="w-40 shrink-0">
                        <DealTile deal={d} added={addedIds.has(d.dealId)} onToggle={toggle} onProof={onProof} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
        {[{ id: 'all', label: 'All', emoji: '🏷️' }, ...EXTRA_CATEGORIES].map((c) => {
          const n = c.id === 'all' ? all.length : counts[c.id]
          if (!n && c.id !== 'all') return null
          const on = cat === c.id
          return (
            <button
              key={c.id}
              aria-pressed={on}
              onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              {c.emoji} {c.label} <span className={on ? 'text-green-100' : 'text-stone-400'}>{n}</span>
            </button>
          )
        })}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">No deals like these in your flyers this week.</p>
      ) : (
        <div className="columns-2 gap-2">
          {shown.map(({ deal }) => (
            <DealTile key={deal.dealId} deal={deal} added={addedIds.has(deal.dealId)} onToggle={toggle} onProof={onProof} />
          ))}
        </div>
      )}
    </Sheet>
  )
}
