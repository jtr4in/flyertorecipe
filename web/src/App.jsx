import { useCallback, useEffect, useMemo, useState } from 'react'
import { firebaseEnabled } from './lib/firebase'
import { DEFAULT_PREFS, fsa, loadDeals, loadPrefs, loadWeek, savePrefs, saveWeek } from './lib/data'
import { activeDeals, buildShoppingList, FILTERS, parsePlanQuery, planWeek, scheduleWeek, weekDays } from './lib/planner'
import { money } from './lib/stores'
import { RECIPES } from './data/recipes'
import Preferences from './components/Preferences'
import Sheet from './components/Sheet'
import WeekStrip from './components/WeekStrip'
import MealCard from './components/MealCard'
import ListSheet, { ListBar } from './components/ListSheet'
import FlyerProof from './components/FlyerProof'

export default function App() {
  const [prefs, setPrefs] = useState(null)
  const [data, setData] = useState({ deals: [], region: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [chips, setChips] = useState([])
  const [sheet, setSheet] = useState(null) // 'settings' | 'list' | { move: dayKey }
  const [listMode, setListMode] = useState('split')
  const [proof, setProof] = useState(null)

  const days = useMemo(() => weekDays(), [])
  const [week, setWeek] = useState(() => loadWeek(days[0].key))
  const editWeek = useCallback((fn) => setWeek((w) => {
    const next = fn(w)
    saveWeek(next)
    return next
  }), [])

  useEffect(() => {
    loadPrefs()
      .then((p) => {
        setPrefs(p)
        if (firebaseEnabled && !p.postalCode) setSheet('settings')
      })
      .catch((e) => {
        setError(e.message)
        setPrefs(DEFAULT_PREFS)
      })
  }, [])

  useEffect(() => {
    if (!prefs) return
    setLoading(true)
    loadDeals(prefs.postalCode)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [prefs?.postalCode])

  const merchants = useMemo(() => [...new Set(data.deals.map((d) => d.merchant).filter(Boolean))].sort(), [data.deals])
  const parsed = useMemo(() => parsePlanQuery(query), [query])
  const filters = useMemo(() => [...new Set([...chips, ...parsed.filters])], [chips, parsed])

  const { deals, schedule, list } = useMemo(() => {
    if (!prefs) return {}
    // Price matchers can use any store's flyer price at their own store.
    const deals = activeDeals(data.deals, { stores: prefs.priceMatch ? [] : prefs.stores })
    const candidates = planWeek(RECIPES, deals, prefs, { filters, skip: week.skip, swaps: week.swaps, meals: 14 })
    const schedule = scheduleWeek(candidates, days, {
      off: week.off,
      order: week.order,
      leftovers: prefs.leftovers !== false,
      budget: parsed.budget,
      maxMeals: parsed.meals,
    })
    return { deals, schedule, list: buildShoppingList(schedule.meals, deals, prefs, { mode: listMode }) }
  }, [prefs, data.deals, filters, parsed.budget, parsed.meals, week, days, listMode])

  const updatePrefs = (next) => {
    setPrefs(next)
    savePrefs(next).catch((e) => setError(e.message))
  }

  if (!prefs) return <p className="p-6 text-stone-500">Loading…</p>

  const cookDays = schedule.days.filter((d) => d.type === 'cook')
  const area = data.region?.fsa || fsa(prefs.postalCode) || (data.region?.demo ? 'Demo' : 'Set area')

  // Actions on the week
  const reroll = (id) => editWeek((w) => ({ ...w, skip: [...w.skip, id] }))
  const nightOff = (key) => editWeek((w) => ({ ...w, off: [...w.off, key] }))
  const cookNight = (key) => editWeek((w) => ({ ...w, off: w.off.filter((k) => k !== key) }))
  const swapIngredient = (recipeId, item, alt) =>
    editWeek((w) => {
      const r = { ...(w.swaps[recipeId] || {}) }
      if (alt) r[item] = alt
      else delete r[item]
      return { ...w, swaps: { ...w.swaps, [recipeId]: r } }
    })
  const moveMeal = (fromKey, toKey) =>
    editWeek((w) => {
      const ids = cookDays.map((d) => d.meal.recipe.id)
      const a = cookDays.findIndex((d) => d.key === fromKey)
      const b = cookDays.findIndex((d) => d.key === toKey)
      ;[ids[a], ids[b]] = [ids[b], ids[a]]
      return { ...w, order: ids }
    })
  const resetWeek = () => editWeek((w) => ({ ...w, off: [], order: [], skip: [], swaps: {} }))
  const toggleChip = (id) => setChips((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const jumpTo = (key) => document.getElementById(`day-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const weekCost = list.totalCost
  const overBudget = parsed.budget != null && weekCost > parsed.budget

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-32">
      <header className="sticky top-0 z-20 -mx-4 bg-stone-50/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-green-800">Flyer2Recipes</h1>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
            Saving {money(list.totalSavings)}
          </span>
        </div>
        <button
          onClick={() => setSheet('settings')}
          className="mt-2 flex w-full flex-wrap items-center gap-1.5 text-left text-xs text-stone-600"
        >
          <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">📍 {area}</span>
          <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">
            🏪 {prefs.priceMatch ? 'Price matching' : prefs.stores.length ? `${prefs.stores.length} stores` : 'All stores'}
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">👥 {prefs.householdSize} people</span>
          {prefs.diet.length > 0 && <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">🥗 {prefs.diet.join(', ')}</span>}
          <span className="ml-auto rounded-full px-2 py-1 text-green-700">⚙︎ Edit</span>
        </button>
      </header>

      {data.region?.demo && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Demo deals: connect Firebase to see your local flyers.</p>
      )}
      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <label className="block">
        <span className="sr-only">What's the plan?</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What's the plan? e.g. quick dinners under $80"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-stone-400 focus:border-green-600 focus:outline-none"
        />
      </label>
      {parsed.budget != null && (
        <div className="mt-2">
          <div className="flex justify-between text-xs">
            <span className="text-stone-600">Week budget</span>
            <span className={overBudget ? 'font-semibold text-red-700' : 'text-stone-600'}>
              {money(weekCost)} of {money(parsed.budget)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
            <div
              className={`h-full rounded-full ${overBudget ? 'bg-red-500' : 'bg-green-600'}`}
              style={{ width: `${Math.min(100, (weekCost / parsed.budget) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const on = filters.includes(f.id)
          return (
            <button
              key={f.id}
              onClick={() => toggleChip(f.id)}
              aria-pressed={on}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              {f.emoji} {f.label}
            </button>
          )
        })}
      </div>

      <div className="mt-5 mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Your week</h2>
        <button onClick={resetWeek} className="text-xs font-medium text-stone-500">
          Reset
        </button>
      </div>
      {loading ? (
        <p className="text-stone-500">Loading deals…</p>
      ) : (
        <>
          <WeekStrip days={schedule.days} onPick={jumpTo} />
          <div className="mt-4 space-y-3">
            {schedule.days.map((d, idx) => {
              if (d.type === 'cook') {
                const next = schedule.days.slice(idx + 1).find((x) => x.type === 'leftovers' && x.meal === d.meal)
                return (
                  <MealCard
                    key={d.key}
                    day={d}
                    nextLeftovers={next ? next.short : null}
                    deals={deals}
                    prefs={prefs}
                    swaps={week.swaps[d.meal.recipe.id]}
                    onSwap={swapIngredient}
                    onReroll={() => reroll(d.meal.recipe.id)}
                    onMove={() => setSheet({ move: d.key })}
                    onNightOff={() => nightOff(d.key)}
                  />
                )
              }
              const label = d.short === 'Today' ? 'Tonight' : d.date.toLocaleDateString('en-CA', { weekday: 'long' })
              return (
                <div
                  key={d.key}
                  id={`day-${d.key}`}
                  className="flex scroll-mt-28 items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-4 py-3"
                >
                  <span className="text-xl" aria-hidden>
                    {d.type === 'leftovers' ? '🥡' : d.type === 'off' ? '🌙' : '🍽️'}
                  </span>
                  <span className="flex-1 text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="block text-xs text-stone-500">
                      {d.type === 'leftovers'
                        ? `Leftovers: ${d.meal.recipe.name}`
                        : d.type === 'off'
                          ? 'Night off'
                          : 'Free night: nothing planned'}
                    </span>
                  </span>
                  {d.type === 'off' && (
                    <button onClick={() => cookNight(d.key)} className="text-xs font-medium text-green-700">
                      + Cook
                    </button>
                  )}
                  {d.type === 'leftovers' && (
                    <button onClick={() => nightOff(d.key)} className="text-xs font-medium text-stone-500">
                      Night off
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <ListBar list={list} onOpen={() => setSheet('list')} />
      <ListSheet
        open={sheet === 'list'}
        onClose={() => setSheet(null)}
        list={list}
        mode={listMode}
        setMode={setListMode}
        checked={week.checked}
        onCheck={(k) => editWeek((w) => ({ ...w, checked: { ...w.checked, [k]: !w.checked[k] } }))}
        postalCode={prefs.postalCode}
        onProof={setProof}
      />
      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} title="Household">
        <Preferences prefs={prefs} merchants={merchants} onChange={updatePrefs} />
      </Sheet>
      <Sheet open={!!sheet?.move} onClose={() => setSheet(null)} title="Move to…">
        <ul className="space-y-2">
          {cookDays
            .filter((d) => d.key !== sheet?.move)
            .map((d) => (
              <li key={d.key}>
                <button
                  onClick={() => {
                    moveMeal(sheet.move, d.key)
                    setSheet(null)
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 p-3 text-left text-sm"
                >
                  <span className="w-20 font-medium">{d.short === 'Today' ? 'Tonight' : d.short}</span>
                  <span className="flex-1 truncate text-stone-500">
                    swap with {d.meal.recipe.emoji} {d.meal.recipe.name}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </Sheet>
      <FlyerProof deal={proof} onClose={() => setProof(null)} />
    </div>
  )
}
