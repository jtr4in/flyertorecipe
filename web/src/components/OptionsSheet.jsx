// "Other options" for a grocery list item: every deal on that same thing this week (all the
// cucumbers on sale), so the household can pick a different brand, size or store.
import Sheet from './Sheet'
import FlyerClip from './FlyerClip'
import { dealName, storeTint } from '../lib/stores'

// Flyers repeat an ad on several pages; show each product, store and price once.
const once = (deals) => {
  const seen = new Set()
  return deals.filter((d) => {
    const k = `${dealName(d.name).toLowerCase()}|${d.merchant}|${d.price}`
    return !seen.has(k) && seen.add(k)
  })
}
// Some flyers shout every name ("CARROTS OR YELLOW ONIONS"); show those in sentence case.
const calm = (t) => (/[a-z]/.test(t) ? t : t.charAt(0) + t.slice(1).toLowerCase())

export default function OptionsSheet({ item, options: all, onPick, onSwap, onClose }) {
  const options = once(all)
  return (
    <Sheet open={!!item} onClose={onClose} title={item ? `Other ${item.item} on sale` : ''} tall>
      {item && (
        <>
          {options.length === 0 ? (
            <p className="mb-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">No {item.item} deals in your flyers this week.</p>
          ) : options.length === 1 && options[0].dealId === item.deal?.dealId ? (
            <p className="mb-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">This is the only {item.item} deal in your flyers this week.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {options.map((d) => {
                const current = d.dealId === item.deal?.dealId
                return (
                  <li key={d.dealId ?? d.name}>
                    <button
                      onClick={() => onPick(d)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left ${current ? 'border-green-600 bg-green-50' : 'border-stone-200 bg-white'}`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-50">
                        {d.imageUrl ? (
                          <img src={d.imageUrl} alt="" loading="lazy" className="max-h-12 max-w-12 object-contain" />
                        ) : d.clip?.box ? (
                          <FlyerClip deal={d} sharp={160} maxHeight="3rem" />
                        ) : (
                          <span aria-hidden>🏷️</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm">{calm(dealName(d.name))}</span>
                        {current && <span className="text-xs font-medium text-green-700">On your list</span>}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold text-green-700">{d.priceLabel || d.priceText}</span>
                        <span className={`inline-block rounded-full px-1.5 text-[10px] font-medium ${storeTint(d.merchant)}`}>{d.merchant}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {item.uses?.length > 0 && (
            <button onClick={onSwap} className="text-sm font-medium text-green-700 underline">
              Use a different ingredient instead
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}
