// Store filters, the same as Flyer2Recipes' settings: pick the store you price match at and only
// the flyers its cashiers accept are used; or pick the stores you shop at.
import Sheet from '@f2r/components/Sheet'
import { MATCH_STORES, PRICE_MATCH } from '@f2r/lib/priceMatch'

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

const Chip = ({ on, children, ...props }) => (
  <button
    type="button"
    {...props}
    aria-pressed={on}
    className={`rounded-full border px-3 py-1.5 text-sm ${
      on ? 'border-orange-600 bg-orange-600 text-white' : 'border-stone-300 bg-white text-stone-700'
    } disabled:border-stone-200 disabled:bg-stone-50 disabled:text-stone-300`}
  >
    {children}
  </button>
)

/** One line saying what the filters do, for the list page. */
export function filterSummary(f) {
  if (f.matchAt) return `Price matching at ${f.matchAt}`
  if (f.stores.length) return f.stores.length === 1 ? `Only ${f.stores[0]}` : `${f.stores.length} stores`
  return 'All stores'
}

export default function FiltersSheet({ open, onClose, filters, merchants, quebec, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })
  const match = PRICE_MATCH[filters.matchAt] || null
  return (
    <Sheet open={open} onClose={onClose} title="Stores and price matching">
      <div className="space-y-6 pb-2">
        <fieldset>
          <legend className="text-sm font-medium">Price match at</legend>
          <div className="mt-2 grid gap-2">
            {['', ...MATCH_STORES].map((s) => (
              <button
                key={s || 'none'}
                type="button"
                onClick={() => set({ matchAt: s })}
                aria-pressed={filters.matchAt === s}
                className={`rounded-2xl border px-3 py-2.5 text-left text-sm ${filters.matchAt === s ? 'border-orange-500 bg-orange-50' : 'border-stone-200 bg-white'}`}
              >
                <span className="block font-semibold">{s || "Don't price match"}</span>
                <span className="block text-xs text-stone-500">{s ? PRICE_MATCH[s].note : 'Show the cheapest flyer price at any store.'}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">Your list, suggestions and flyers then use only flyers that store's cashiers accept. Policies vary by location, so check the list by the tills.</p>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Stores</legend>
          <p className="text-xs text-stone-500">
            {match
              ? `${filters.matchAt} accepts the flyers in orange. Grey ones can't be price matched there.`
              : 'Use these flyers only. None selected means every store near you.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {merchants.length === 0 && <span className="text-sm text-stone-400">Enter your postal code to see stores.</span>}
            {merchants.map((m) =>
              match && match.optional.includes(m) ? (
                <Chip key={m} on={(filters.matchExtras || []).includes(m)} onClick={() => set({ matchExtras: toggle(filters.matchExtras || [], m) })}>
                  {m} <span className="text-xs opacity-75">(if your store takes it)</span>
                </Chip>
              ) : (
                <Chip
                  key={m}
                  on={filters.stores.includes(m)}
                  disabled={!!match && m !== filters.matchAt && !match.accepts.includes(m)}
                  onClick={() => set({ stores: toggle(filters.stores, m) })}
                >
                  {m}
                </Chip>
              ),
            )}
          </div>
          {!match && filters.stores.length > 0 && (
            <button type="button" onClick={() => set({ stores: [] })} className="mt-3 text-sm font-medium text-orange-700">
              Use every store
            </button>
          )}
        </fieldset>

        {quebec > 0 && (
          <label className="flex items-start gap-3 rounded-2xl border border-stone-200 p-3">
            <input
              type="checkbox"
              checked={!!filters.quebec}
              onChange={(e) => set({ quebec: e.target.checked })}
              disabled={!!match}
              className="mt-0.5 size-5 shrink-0 accent-orange-600"
            />
            <span className="text-sm">
              <span className="block font-semibold">Include Quebec flyers</span>
              <span className="block text-xs text-stone-500">
                Maxi, Provigo, Super C, IGA, Metro Quebec and others near you. Ontario stores won't price match them{match ? ', so they stay off while price matching' : ''}.
              </span>
            </span>
          </label>
        )}
      </div>
    </Sheet>
  )
}
