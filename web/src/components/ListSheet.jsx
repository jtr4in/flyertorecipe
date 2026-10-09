import { useState } from 'react'
import Sheet from './Sheet'
import FlyerPeek from './FlyerPeek'
import FlyerGallery from './FlyerGallery'
import { flyerUrl, mapsUrl, money, storeTint } from '../lib/stores'

/** Collapsed bar pinned to the bottom of the page. */
export function ListBar({ list, onOpen }) {
  if (!list?.itemCount) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        data-tour="list"
        onClick={onOpen}
        className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-left text-white shadow-xl"
      >
        <span className="text-xl" aria-hidden>
          🛒
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Grocery list · {list.itemCount} items</span>
          <span className="block text-xs text-stone-300">
            est. {money(list.totalCost)} · {list.onSale} from flyers
          </span>
        </span>
        <span className="rounded-full bg-green-500 px-2.5 py-1 text-xs font-semibold text-stone-900">
          Save {money(list.totalSavings)}
        </span>
      </button>
    </div>
  )
}

const TABS = [
  ['match', 'Price Matching'],
  ['single', 'One Store'],
]

export default function ListSheet({ open, onClose, list, mode, setMode, stores, onStore, checked, onCheck, postalCode, onProof, onSwap }) {
  const [gallery, setGallery] = useState(false)
  if (!list) return null
  const items = list.groups.flatMap((g) => g.items)
  const done = items.filter((i) => checked[i.key]).length

  const share = async () => {
    const text = [
      list.store ? `${mode === 'match' ? 'Price matching at' : 'Shopping at'} ${list.store}` : 'Grocery list',
      ...list.groups.map(
        (g) =>
          `\n${g.title}\n${g.items
            .map((i) => `- ${i.item} (${i.buy})${i.deal ? ` ${i.deal.priceLabel}${mode === 'match' ? ` @ ${i.deal.merchant}` : ''}` : ''}`)
            .join('\n')}`,
      ),
    ].join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'Grocery list', text })
      else await navigator.clipboard.writeText(text)
    } catch {
      /* dismissed */
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Grocery list"
      tall
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {list.itemCount} items · est. {money(list.totalCost)}
            </p>
            <p className="text-xs text-green-700">
              Saves about {money(list.totalSavings)} · {done} checked off
            </p>
          </div>
          <button onClick={share} className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium">
            Share
          </button>
        </div>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1 text-sm font-medium" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`rounded-xl px-2 py-2 ${mode === id ? 'bg-white shadow-sm' : 'text-stone-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'match' ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-green-50 p-3">
          <p className="flex-1 text-xs text-green-900">
            Every item at its lowest flyer price from {list.matchStores.length} store{list.matchStores.length === 1 ? '' : 's'}.
            Show the cashier the flyers at checkout.
          </p>
          <button
            onClick={() => setGallery(true)}
            disabled={!list.flyers.length}
            className="shrink-0 rounded-xl bg-green-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            View all flyers
          </button>
        </div>
      ) : null}
      {mode === 'single' && (
        <div className="mb-4 rounded-2xl bg-stone-100 p-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Store</span>
            <select
              value={list.store || ''}
              onChange={(e) => onStore(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5"
            >
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                  {s === list.suggestedStore?.store ? ' (most on sale)' : ''}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1.5 text-xs text-stone-500">
            {list.onSale} of {list.itemCount} items on sale here; the rest at regular price.{' '}
            {list.store && (
              <>
                <a className="text-green-700 underline" href={flyerUrl(list.store)} target="_blank" rel="noreferrer">
                  Full flyer
                </a>{' '}
                ·{' '}
                <a className="text-green-700 underline" href={mapsUrl(list.store, postalCode)} target="_blank" rel="noreferrer">
                  Directions
                </a>
              </>
            )}
          </p>
        </div>
      )}

      <p className="mb-2 text-[11px] text-stone-400">Hover or tap an item to see its flyer ad.</p>

      <div className="space-y-5">
        {list.groups.map((g) => (
          <section key={g.title}>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{g.title}</h3>
            <ul className="divide-y divide-stone-100">
              {g.items.map((i) => (
                <li key={i.key} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Got ${i.item}`}
                    checked={!!checked[i.key]}
                    onChange={() => onCheck(i.key)}
                    className="size-5 shrink-0 accent-green-700"
                  />
                  <FlyerPeek deal={i.deal} onOpen={onProof} className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={`min-w-0 flex-1 ${checked[i.key] ? 'text-stone-400 line-through' : ''}`}>
                      <span className="block truncate text-sm font-medium">
                        {i.item} <span className="font-normal text-stone-500">· {i.buy}</span>
                      </span>
                      <span className="block truncate text-[11px] text-stone-400">{i.meals.join(', ')}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      {i.deal ? (
                        <>
                          <span className="block text-sm font-semibold text-green-700">{i.deal.priceLabel}</span>
                          {mode === 'match' && (
                            <span className={`inline-block rounded-full px-1.5 text-[10px] font-medium ${storeTint(i.deal.merchant)}`}>
                              {i.deal.merchant}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="block text-xs text-stone-400">reg. ~{money(i.cost)}</span>
                      )}
                    </span>
                  </FlyerPeek>
                  <button
                    onClick={() => onSwap(i)}
                    aria-label={`Swap ${i.item}`}
                    className="shrink-0 rounded-lg px-1.5 py-1 text-stone-400 hover:bg-stone-100 hover:text-green-700"
                  >
                    ⇄
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {list.pantry.length > 0 && (
          <p className="text-xs text-stone-500">
            <span className="font-medium">From your pantry:</span> {list.pantry.join(', ')}
          </p>
        )}
      </div>
      <FlyerGallery open={gallery} flyers={list.flyers} stores={list.matchStores} store={list.store} onClose={() => setGallery(false)} />
    </Sheet>
  )
}
