import { DIET_TAGS } from '../lib/aisles'
import { fsa } from '../lib/data'

const Chip = ({ on, children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`rounded-full border px-3 py-1.5 text-sm ${
      on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    }`}
  >
    {children}
  </button>
)

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export default function Preferences({ prefs, merchants, onChange }) {
  const set = (patch) => onChange({ ...prefs, ...patch })
  const validPostal = !prefs.postalCode || fsa(prefs.postalCode)

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <label className="block">
        <span className="text-sm font-medium">Postal code</span>
        <input
          className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 uppercase"
          defaultValue={prefs.postalCode}
          placeholder="M5V 2T6"
          autoComplete="postal-code"
          onBlur={(e) => set({ postalCode: e.target.value.trim().toUpperCase() })}
        />
        {!validPostal && <span className="text-xs text-red-600">That doesn't look like a Canadian postal code.</span>}
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">People</span>
          <input
            type="number" min="1" max="12"
            className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2"
            value={prefs.householdSize}
            onChange={(e) => set({ householdSize: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Dinners per week</span>
          <input
            type="number" min="1" max="7"
            className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2"
            value={prefs.mealsPerWeek}
            onChange={(e) => set({ mealsPerWeek: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })}
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Diet</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIET_TAGS.map((t) => (
            <Chip key={t.id} on={prefs.diet.includes(t.id)} onClick={() => set({ diet: toggle(prefs.diet, t.id) })}>
              {t.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Stores</legend>
        <p className="text-xs text-stone-500">None selected means every store in your area.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {merchants.length === 0 && <span className="text-sm text-stone-400">No stores loaded yet.</span>}
          {merchants.map((m) => (
            <Chip key={m} on={prefs.stores.includes(m)} onClick={() => set({ stores: toggle(prefs.stores, m) })}>
              {m}
            </Chip>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-green-700"
          checked={!!prefs.priceMatch}
          onChange={(e) => set({ priceMatch: e.target.checked })}
        />
        <span>
          <span className="text-sm font-medium">I price match</span>
          <span className="block text-xs text-stone-500">
            Use every store's flyer prices, and show the flyer image to bring to the till.
          </span>
        </span>
      </label>
    </form>
  )
}
