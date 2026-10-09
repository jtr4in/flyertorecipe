import Sheet from './Sheet'
import { dealName, mapsUrl, money, storeTint } from '../lib/stores'

const fmtQty = (q, unit) => `${Number.isInteger(q) ? q : q.toFixed(2).replace(/0$/, '')} ${unit}`

/** Collapsed bar pinned to the bottom of the page. */
export function ListBar({ list, onOpen }) {
  if (!list?.itemCount) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        onClick={onOpen}
        className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-left text-white shadow-xl"
      >
        <span className="text-xl" aria-hidden>
          🛒
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Your list · {list.itemCount} items</span>
          <span className="block text-xs text-stone-300">
            est. {money(list.totalCost)} · {list.stores.filter((s) => s.store !== 'Any store').length} store
            {list.stores.length === 1 ? '' : 's'}
          </span>
        </span>
        <span className="rounded-full bg-green-500 px-2.5 py-1 text-xs font-semibold text-stone-900">
          Save {money(list.totalSavings)}
        </span>
      </button>
    </div>
  )
}

export default function ListSheet({ open, onClose, list, mode, setMode, checked, onCheck, postalCode, onProof }) {
  if (!list) return null
  const done = list.stores.flatMap((s) => s.items).filter((i) => checked[`${i.item}|${i.unit}`]).length

  const share = async () => {
    const text = list.stores
      .map((s) => `${s.store}\n${s.items.map((i) => `- ${i.item} (${fmtQty(i.qty, i.unit)})${i.deal ? ` ${i.deal.priceLabel || ''}` : ''}`).join('\n')}`)
      .join('\n\n')
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
      title="Smart grocery list"
      tall
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {list.itemCount} items · est. {money(list.totalCost)}
            </p>
            <p className="text-xs text-green-700">Saves about {money(list.totalSavings)} · {done} checked off</p>
          </div>
          <button onClick={share} className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium">
            Share
          </button>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1 text-sm font-medium" role="tablist">
        {[
          ['split', 'Best 3 stores'],
          ['single', 'One store'],
        ].map(([id, label]) => (
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
      {mode === 'single' && list.single && (
        <p className="mb-3 text-xs text-stone-500">
          {list.single.store} has {list.single.covered} of your {list.itemCount} items on sale. The rest are at regular price there.
        </p>
      )}

      <div className="space-y-5">
        {list.stores.map((group) => (
          <section key={group.store}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${storeTint(group.store)}`}>
                {group.store}
              </span>
              {group.savings > 0 && <span className="text-xs text-green-700">saves {money(group.savings)}</span>}
              {group.store !== 'Any store' && (
                <a
                  href={mapsUrl(group.store, postalCode)}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-xs font-medium text-green-700"
                >
                  Map ↗
                </a>
              )}
            </div>
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
              {group.items.map((it) => {
                const k = `${it.item}|${it.unit}`
                return (
                  <li key={k} className="flex items-start gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-green-700"
                      checked={!!checked[k]}
                      onChange={() => onCheck(k)}
                      aria-label={it.item}
                    />
                    <div className={`min-w-0 flex-1 ${checked[k] ? 'text-stone-400 line-through' : ''}`}>
                      <p className="text-sm">
                        <span className="font-medium">{it.item}</span>{' '}
                        <span className="text-stone-500">{fmtQty(it.qty, it.unit)}</span>
                      </p>
                      {it.deal ? (
                        <p className="truncate text-xs text-stone-500">
                          {dealName(it.deal.name)} · {it.deal.priceLabel || it.deal.priceText}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-400">Not on sale · est. {money(it.cost)}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {it.savings > 0 && <p className="text-xs font-medium text-green-700">−{money(it.savings)}</p>}
                      {it.deal && (
                        <button
                          onClick={() => onProof(it.deal)}
                          className="mt-0.5 rounded-md border border-stone-300 px-1.5 py-0.5 text-[11px] font-medium text-stone-600"
                        >
                          Flyer
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {list.pantry.length > 0 && (
          <section>
            <p className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">Check your pantry</p>
            <p className="text-sm text-stone-600">{list.pantry.join(', ')}</p>
          </section>
        )}
      </div>
    </Sheet>
  )
}
