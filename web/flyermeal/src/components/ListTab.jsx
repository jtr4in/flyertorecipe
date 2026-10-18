import { useMemo, useState } from 'react'
import FlyerClip from '@f2r/components/FlyerClip'
import FlyerProof from '@f2r/components/FlyerProof'
import { fsa } from '@f2r/lib/data'
import { searchDeals, suggestNeeds } from '@f2r/lib/needs'
import { dealName, money, shortDay } from '@f2r/lib/stores'
import { recommend } from '../lib/recommend'
import FlyersView from './FlyersView'
import { filterSummary } from './FiltersSheet'

const MORE = 6 // suggestions per section, and how many more each tap adds
const EXAMPLES = ['chicken thighs', 'rice', 'broccoli', 'eggs', 'toilet paper']

export default function ListTab({ postal, setPostal, dealState, deals, filters, openFilters, lines, add, update, remove, clear }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(null) // list line whose other deals are showing
  const [flyers, setFlyers] = useState(false)
  const [zoom, setZoom] = useState(null) // list line whose flyer ad is blown up
  const [more, setMore] = useState(MORE) // household and kitchen suggestions showing, per section
  // Memoized so typing in the box doesn't redo the suggestions below, which scan every flyer ad.
  const names = useMemo(() => lines.map((l) => l.name), [lines])
  const lower = useMemo(() => names.map((n) => n.toLowerCase()), [names])
  const picks = useMemo(() => (text.trim().length > 1 ? suggestNeeds(text, deals, lower, 6) : []), [text, deals, lower])
  const recs = useMemo(() => (lines.length ? recommend(names, deals) : null), [names, deals, lines.length])
  const onSale = lines.filter((l) => l.deal).length
  const mine = useMemo(() => [...new Map(lines.filter((l) => l.deal).map((l) => [l.deal.dealId, l.deal])).values()], [lines])

  const submit = (e) => {
    e.preventDefault()
    add(text.split(/[,\n;]+/))
    setText('')
  }

  return (
    <div className="space-y-5">
      {!fsa(postal) && <PostalCard onSave={setPostal} />}
      {dealState === 'none' && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">We don't have flyers for {fsa(postal)} yet. You can still build a list and find recipes.</p>
      )}
      {dealState === 'error' && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">Couldn't load this week's flyers. Check your connection and reload.</p>}

      <form onSubmit={submit} className="relative">
        <label htmlFor="add" className="sr-only">
          Add to your list
        </label>
        <div className="flex gap-2">
          <input
            id="add"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add items, like chicken thighs, rice"
            autoComplete="off"
            enterKeyHint="done"
            className="min-w-0 flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
          />
          <button disabled={!text.trim()} className="rounded-2xl bg-orange-600 px-5 font-semibold text-white disabled:opacity-40">
            Add
          </button>
        </div>
        {picks.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg" role="listbox" aria-label="Suggestions">
            {picks.map((p) => (
              <li key={p.need + (p.deal?.dealId || '')}>
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => {
                    const before = text.split(/[,\n;]+/).slice(0, -1)
                    add([...before, p.need], p.deal?.dealId)
                    setText('')
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-orange-50"
                >
                  <span className="truncate capitalize">{p.need}</span>
                  {p.deal && (
                    <span className="shrink-0 text-sm text-green-700">
                      {p.deal.priceLabel} · {p.deal.merchant}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {fsa(postal) && (
        <button
          onClick={openFilters}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-left text-sm shadow-sm"
        >
          <span className="min-w-0 truncate">
            🏷️ <span className="font-semibold">{filterSummary(filters)}</span>
            {filters.matchAt && <span className="text-stone-500"> · only flyers they accept</span>}
          </span>
          <span className="shrink-0 font-medium text-orange-700">Filters ›</span>
        </button>
      )}
      {deals.length > 0 && (
        <button
          onClick={() => setFlyers(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-left font-semibold text-orange-800 active:scale-[0.99]"
        >
          <span>🗞️ View flyers</span>
          <span className="text-sm font-normal text-orange-700">{onSale ? `${onSale} on your list` : `${new Set(deals.map((d) => d.merchant)).size} stores`} ›</span>
        </button>
      )}
      <FlyersView
        open={flyers}
        deals={deals}
        mine={mine}
        onClose={() => setFlyers(false)}
        add={add}
        onList={(name) => names.some((n) => n.toLowerCase() === name.toLowerCase())}
      />

      {lines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-5 text-center">
          <p className="font-semibold">Write your grocery list</p>
          <p className="mt-1 text-sm text-stone-500">We'll find each item in this week's flyers. Browse Recipes to add a whole meal at once.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => add(e)} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm">
                + {e}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-stone-500">
              Your list · {onSale} of {lines.length} on sale
            </h2>
            <button onClick={clear} className="text-sm text-stone-400 hover:text-rose-600">
              Clear
            </button>
          </div>
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            {lines.map((l) => (
              <ListLine
                key={l.name}
                line={l}
                deals={deals}
                open={open === l.name}
                onOpen={() => setOpen(open === l.name ? null : l.name)}
                onZoom={() => setZoom(l)}
                onPick={(d) => (update(l.name, { dealId: d.dealId }), setOpen(null))}
                onCheck={() => update(l.name, { checked: !l.checked })}
                onRemove={() => remove(l.name)}
              />
            ))}
          </ul>
        </section>
      )}

      <FlyerProof
        deal={zoom?.deal}
        onClose={() => setZoom(null)}
        action={zoom && { label: 'Other deals', onClick: () => (setOpen(zoom.name), setZoom(null)) }}
      />

      {recs && (
        <>
          <Recs title="Goes with your list" rows={recs.pairs} add={add} showBecause />
          <Recs title="Household basics on sale" rows={recs.household.slice(0, more)} add={add} />
          <Recs title="Kitchen staples on sale" rows={recs.staples.slice(0, more)} add={add} />
          {Math.max(recs.household.length, recs.staples.length) > more && (
            <button onClick={() => setMore(more + MORE)} className="mx-auto block rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-medium text-stone-700 shadow-sm">
              Load more suggestions
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ListLine({ line, deals, open, onOpen, onZoom, onPick, onCheck, onRemove }) {
  const d = line.deal
  const others = useMemo(() => (open ? searchDeals(line.name, deals).slice(0, 8) : []), [open, line.name, deals])
  return (
    <li className={line.checked ? 'bg-stone-50' : ''}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <input type="checkbox" checked={line.checked} onChange={onCheck} className="size-5 shrink-0 accent-orange-600" aria-label={`Got ${line.name}`} />
        {d && (
          <button
            onClick={onZoom}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-white transition hover:scale-110 hover:shadow-md"
            aria-label={`See the ${d.merchant} flyer ad for ${line.name}`}
          >
            <FlyerClip deal={d} maxHeight="3rem" sharp={200} />
          </button>
        )}
        <button onClick={onOpen} disabled={!d} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="min-w-0">
            <p className={`truncate font-medium capitalize ${line.checked ? 'text-stone-400 line-through' : ''}`}>{line.name}</p>
            {d ? (
              <p className="truncate text-sm text-stone-500">
                <span className="font-semibold text-green-700">{d.priceLabel}</span> · {d.merchant}
                {d.validTo && <span className="text-stone-400"> · until {shortDay(d.validTo)}</span>}
              </p>
            ) : (
              <p className="text-sm text-stone-400">Not in this week's flyers</p>
            )}
          </div>
        </button>
        <button onClick={onRemove} className="shrink-0 rounded-full p-2 text-stone-400 hover:text-rose-600" aria-label={`Remove ${line.name}`}>
          ✕
        </button>
      </div>
      {open && (
        <div className="space-y-1.5 bg-orange-50/60 px-3 pt-1 pb-3">
          <p className="px-1 text-xs font-semibold text-stone-500">Other deals for {line.name}</p>
          {others.map((o) => (
            <button
              key={o.dealId}
              onClick={() => onPick(o)}
              className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-2 text-left ${o.dealId === d?.dealId ? 'border-orange-400' : 'border-stone-200'}`}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                <FlyerClip deal={o} maxHeight="3.5rem" sharp={200} />
              </div>
              <div className="min-w-0 text-sm">
                <p className="line-clamp-2">{dealName(o.name)}</p>
                <p className="text-stone-500">
                  <span className="font-semibold text-green-700">{o.priceLabel}</span> · {o.merchant}
                  {o.savings > 0 && <span className="text-green-700"> · save {money(o.savings)}</span>}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </li>
  )
}

function Recs({ title, rows, add, showBecause }) {
  if (!rows?.length) return null
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-stone-500">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <button
            key={r.name}
            onClick={() => add(r.name, r.deal?.dealId)}
            className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left shadow-sm active:scale-[0.98]"
            title={r.deal ? `${dealName(r.deal.name)} at ${r.deal.merchant}` : undefined}
          >
            <span className="text-lg">{r.emoji}</span>
            <span className="text-sm">
              <span className="block font-medium capitalize">+ {r.name}</span>
              {r.deal ? (
                <span className="block text-xs text-green-700">
                  {r.deal.priceLabel} · {r.deal.merchant}
                </span>
              ) : (
                showBecause && <span className="block text-xs text-stone-400">for your {r.because}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PostalCard({ onSave }) {
  const [value, setValue] = useState('')
  const ok = fsa(value)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) onSave(value.toUpperCase().replace(/\s+/g, ''))
      }}
      className="rounded-3xl bg-orange-600 p-4 text-white shadow-md"
    >
      <p className="font-semibold">Where do you shop?</p>
      <p className="mt-0.5 text-sm text-orange-100">Your postal code finds this week's flyers near you.</p>
      <div className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="K1A 0B1"
          aria-label="Postal code"
          className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-base text-stone-900 uppercase placeholder:normal-case"
        />
        <button disabled={!ok} className="rounded-xl bg-white px-4 font-semibold text-orange-700 disabled:opacity-60">
          Find deals
        </button>
      </div>
    </form>
  )
}
