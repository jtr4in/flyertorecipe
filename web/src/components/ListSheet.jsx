import { useState } from 'react'
import Sheet from './Sheet'
import FlyerPeek from './FlyerPeek'
import FlyerGallery from './FlyerGallery'
import { MATCH_STORES } from '../lib/priceMatch'
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

// Shop mode: the same list as a page of its own, with the totals and Share pinned at the bottom.
function InlinePanel({ title, footer, children }) {
  return (
    <section aria-label={title}>
      {children}
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">{footer}</div>
    </section>
  )
}

export default function ListSheet({ inline = false, open, onClose, list, mode, setMode, stores, onStore, checked, onCheck, postalCode, onProof, onSwap, onOptions, onRemoveExtra, onShareLink, shared, matchAt, matchExtras, onMatch, pantryDeals = {} }) {
  const [gallery, setGallery] = useState(false)
  if (!list) return null
  const items = list.groups.flatMap((g) => g.items)
  const done = items.filter((i) => checked[i.key]).length

  const shareText = async () => {
    const text = [
      list.store ? `${mode === 'match' ? 'Price matching at' : 'Shopping at'} ${list.store}` : 'Grocery list',
      ...list.groups.map(
        (g) =>
          `\n${g.title}\n${g.items
            .map((i) => `- ${i.item} (${i.buy})${i.deal ? ` ${i.deal.priceLabel}${mode === 'match' ? ` @ ${i.deal.merchant}` : ''}` : ''}`)
            .join('\n')}`,
      ),
      ...(list.pantryCheck.length
        ? [`\nCheck the pantry for\n${list.pantryCheck.flatMap((g) => g.items.filter((p) => !checked[`pantry:${p.item.toLowerCase()}`]).map((p) => `- ${p.item}`)).join('\n')}`]
        : []),
    ].join('\n')
    try {
      if (navigator.share) return await navigator.share({ title: 'Grocery list', text })
    } catch (e) {
      if (e.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(text)
      window.alert('Grocery list copied. Paste it into a message.')
    } catch {
      window.prompt('Copy your grocery list:', text)
    }
  }

  const Panel = inline ? InlinePanel : Sheet
  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Grocery list"
      tall
      footer={
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {list.itemCount} items · est. {money(list.totalCost)}
            </p>
            {/* Flyers that print a regular price count exactly; the rest assume the usual ~23% off. */}
            <p className="text-xs text-green-700">
              Saves about {money(list.totalSavings)} · {done} checked off
            </p>
            {shared && <p className="text-[11px] text-stone-500">🔗 Shared · checkmarks update live</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              onClick={onShareLink || shareText}
              className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white"
            >
              {onShareLink ? '🔗 Share' : 'Share'}
            </button>
            {onShareLink && (
              <button onClick={shareText} className="text-[11px] text-stone-500 underline">
                Send as text
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* One card for how you're shopping: the mode, where, and what that means. */}
      <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm font-medium" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`rounded-lg px-2 py-1.5 ${mode === id ? 'bg-white shadow-sm' : 'text-stone-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 px-1 text-sm">
          <span className="shrink-0 text-stone-500">{mode === 'match' ? 'Match at' : 'Store'}</span>
          {mode === 'match' ? (
            <select
              value={matchAt}
              onChange={(e) => onMatch(e.target.value, matchExtras)}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1"
            >
              <option value="">Any store</option>
              {MATCH_STORES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={list.store || ''}
              onChange={(e) => onStore(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1"
            >
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                  {s === list.suggestedStore?.store ? ' (most on sale)' : ''}
                </option>
              ))}
            </select>
          )}
        </label>
        <p className="mt-1.5 px-1 text-xs text-stone-500">
          {mode === 'match' ? (
            <>
              Lowest flyer price from {list.matchStores.length} store{list.matchStores.length === 1 ? '' : 's'}; show the cashier the flyers.{' '}
              {list.flyers.length > 0 && (
                <button onClick={() => setGallery(true)} className="font-medium text-green-700 underline">
                  View flyers
                </button>
              )}
            </>
          ) : (
            <>
              {list.onSale} of {list.itemCount} on sale here.{' '}
              {list.store && (
                <>
                  <a className="font-medium text-green-700 underline" href={flyerUrl(list.store)} target="_blank" rel="noreferrer">
                    Flyer
                  </a>{' '}
                  ·{' '}
                  <a className="font-medium text-green-700 underline" href={mapsUrl(list.store, postalCode)} target="_blank" rel="noreferrer">
                    Directions
                  </a>
                </>
              )}
            </>
          )}
        </p>
      </div>

      <div className="space-y-5">
        {list.groups.map((g) => (
          <section key={g.title}>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{g.title}</h3>
            <ul className="divide-y divide-stone-100">
              {g.items.map((i) => (
                <li key={i.key} className="flex items-center gap-2.5 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Got ${i.item}`}
                    checked={!!checked[i.key]}
                    onChange={() => onCheck(i.key)}
                    className="size-5 shrink-0 accent-green-700"
                  />
                  <FlyerPeek
                    deal={i.deal}
                    onOpen={(d) => onProof(d, (i.ing || i.need) && onOptions ? i : null)}
                    action={(i.ing || i.need) && onOptions ? { label: 'Other options', onClick: () => onOptions(i) } : null}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <span className={`min-w-0 flex-1 ${checked[i.key] ? 'text-stone-400 line-through' : ''}`}>
                      <span className="block truncate text-sm font-medium">
                        {i.item} <span className="font-normal text-stone-500">· {i.buy}</span>
                      </span>
                      <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-stone-400">
                        {i.deal && mode === 'match' && (
                          <span className={`max-w-[55%] shrink-0 truncate rounded-full px-1.5 text-[10px] font-medium ${storeTint(i.deal.merchant)}`}>{i.deal.merchant}</span>
                        )}
                        <span className="truncate" title={i.meals.join(', ')}>
                          {i.meals[0]}
                          {i.meals.length > 1 && ` +${i.meals.length - 1}`}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {i.deal ? (
                        <span className="block text-sm font-semibold text-green-700">{i.deal.priceLabel}</span>
                      ) : i.need ? null : (
                        <span className="block text-xs text-stone-400">reg. ~{money(i.cost)}</span>
                      )}
                    </span>
                  </FlyerPeek>
                  {onOptions && (i.ing || i.need) && (
                    <button
                      onClick={() => onOptions(i)}
                      aria-label={`Other options for ${i.item}`}
                      className="shrink-0 rounded-lg px-1.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                    >
                      Options
                    </button>
                  )}
                  {i.extra || i.need ? (
                    <button
                      onClick={() => onRemoveExtra(i)}
                      aria-label={`Remove ${i.item}`}
                      className="shrink-0 rounded-lg px-1.5 py-1 text-stone-400 hover:bg-stone-100 hover:text-red-600"
                    >
                      ✕
                    </button>
                  ) : onOptions ? null : (
                    <button
                      onClick={() => onSwap(i)}
                      aria-label={`Swap ${i.item}`}
                      className="shrink-0 rounded-lg px-1.5 py-1 text-stone-400 hover:bg-stone-100 hover:text-green-700"
                    >
                      ⇄
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {list.pantryCheck.length > 0 && (
          <section className="rounded-2xl bg-amber-50 p-3">
            <h3 className="text-sm font-semibold text-amber-900">Check your pantry</h3>
            <p className="mb-1 text-xs text-amber-800">Tick what you have; buy the rest.</p>
            <ul>
              {list.pantryCheck
                .flatMap((g) => g.items)
                .map((p) => {
                  const k = `pantry:${p.item.toLowerCase()}`
                  const deal = pantryDeals[p.item]
                  return (
                    <li key={k} className="flex items-center gap-2.5 py-1" title={p.meals.join(', ')}>
                      <input
                        type="checkbox"
                        aria-label={`Have ${p.item}`}
                        checked={!!checked[k]}
                        onChange={() => onCheck(k)}
                        className="size-5 shrink-0 accent-green-700"
                      />
                      <span className={`min-w-0 flex-1 text-sm ${checked[k] ? 'text-stone-400 line-through' : ''}`}>{p.item}</span>
                      {deal && (
                        <FlyerPeek deal={deal} onOpen={(d) => onProof(d, null)} className="flex max-w-[60%] shrink-0 items-center gap-1.5">
                          <span className={`max-w-[7rem] truncate rounded-full px-1.5 text-[10px] font-medium ${storeTint(deal.merchant)}`}>{deal.merchant}</span>
                          <span className="text-sm font-semibold text-green-700">{deal.priceLabel || deal.priceText}</span>
                        </FlyerPeek>
                      )}
                    </li>
                  )
                })}
            </ul>
          </section>
        )}
        {list.pantry.length > 0 && (
          <p className="text-xs text-stone-500">
            <span className="font-medium">Staples you probably have:</span> {list.pantry.join(', ')}
          </p>
        )}
      </div>
      <FlyerGallery open={gallery} flyers={list.flyers} stores={list.matchStores} store={list.store} onClose={() => setGallery(false)} />
    </Panel>
  )
}
