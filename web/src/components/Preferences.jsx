import { DIET_TAGS } from '../lib/aisles'
import { fsa } from '../lib/data'
import { fullSchedule, ScheduleGrid, withSchedule } from './PlanSteps'
import { MATCH_STORES, PRICE_MATCH } from '../lib/priceMatch'

const Chip = ({ on, children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`rounded-full border px-3 py-1.5 text-sm ${
      on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    } disabled:border-stone-200 disabled:bg-stone-50 disabled:text-stone-300`}
  >
    {children}
  </button>
)

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export default function Preferences({ prefs, merchants, onChange }) {
  const set = (patch) => onChange({ ...prefs, ...patch })
  const validPostal = !prefs.postalCode || fsa(prefs.postalCode)
  const match = PRICE_MATCH[prefs.matchAt] || null

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

      <label className="block">
        <span className="text-sm font-medium">People</span>
        <input
          type="number" min="1" max="12"
          className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2"
          value={prefs.householdSize}
          onChange={(e) => set({ householdSize: Math.max(1, Number(e.target.value) || 1) })}
        />
      </label>

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

      <label className="block">
        <span className="text-sm font-medium">Price match at</span>
        <select
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
          value={prefs.matchAt || ''}
          onChange={(e) => set({ matchAt: e.target.value })}
        >
          <option value="">Don't price match (cheapest flyer anywhere)</option>
          {MATCH_STORES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs text-stone-500">Meals and the list use only flyers that store's cashiers accept.</span>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Stores</legend>
        <p className="text-xs text-stone-500">
          {match
            ? `${prefs.matchAt} accepts the flyers in green. Grey ones can't be price matched there.`
            : 'Plan from these flyers only. None selected means every store in your area.'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {merchants.length === 0 && <span className="text-sm text-stone-400">No stores loaded yet.</span>}
          {merchants.map((m) =>
            match && match.optional.includes(m) ? (
              <Chip key={m} on={(prefs.matchExtras || []).includes(m)} onClick={() => set({ matchExtras: toggle(prefs.matchExtras || [], m) })}>
                {m} <span className="text-xs opacity-75">(if your store takes it)</span>
              </Chip>
            ) : (
              <Chip
                key={m}
                on={prefs.stores.includes(m)}
                disabled={!!match && m !== prefs.matchAt && !match.accepts.includes(m)}
                onClick={() => set({ stores: toggle(prefs.stores, m) })}
              >
                {m}
              </Chip>
            ),
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Meals to plan</legend>
        <p className="text-xs text-stone-500">Tick the meals for each day. Tap a meal at the top for the whole week.</p>
        <ScheduleGrid schedule={fullSchedule(prefs)} onChange={(schedule) => onChange(withSchedule(prefs, schedule))} />
      </fieldset>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-green-700"
          checked={prefs.lunchLeftovers !== false}
          onChange={(e) => set({ lunchLeftovers: e.target.checked })}
        />
        <span>
          <span className="text-sm font-medium">Lunch is last night's leftovers</span>
          <span className="block text-xs text-stone-500">Dinner cooks double so tomorrow's lunch is covered.</span>
        </span>
      </label>
    </form>
  )
}
