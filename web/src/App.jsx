import { useCallback, useEffect, useMemo, useState } from 'react'
import { firebaseEnabled } from './lib/firebase'
import { DEFAULT_PREFS, fsa, loadDeals, loadPrefs, loadWeek, savePrefs, saveWeek } from './lib/data'
import { activeDeals, buildShoppingList, FILTERS, listSwapOptions, parsePlanQuery, planWeek, swapOptions, weekDays } from './lib/planner'
import { dealName, money, storeTint } from './lib/stores'
import { cap, MEALS } from './data/templates'
import Preferences from './components/Preferences'
import Sheet from './components/Sheet'
import WeekStrip from './components/WeekStrip'
import MealCard from './components/MealCard'
import ListSheet, { ListBar } from './components/ListSheet'
import FlyerProof from './components/FlyerProof'
import IdeaSheet from './components/IdeaSheet'
import PrintWeek from './components/PrintWeek'

export default function App() {
  const [prefs, setPrefs] = useState(null)
  const [data, setData] = useState({ deals: [], region: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [chips, setChips] = useState([])
  const [sheet, setSheet] = useState(null) // 'settings' | 'list'
  const [ideaFor, setIdeaFor] = useState(null) // the meal entry "Another idea" was tapped on
  const [printing, setPrinting] = useState(false)
  const [swapping, setSwapping] = useState(null) // [{ meal, line }]: every meal the swap applies to
  const [listMode, setListMode] = useState('match')
  const [proof, setProof] = useState(null)

  const days = useMemo(() => weekDays(), [])
  const [selected, setSelected] = useState(days[0].key)
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

  const deals = useMemo(() => (prefs ? activeDeals(data.deals, { stores: prefs.stores }) : []), [prefs, data.deals])
  const plan = useMemo(
    () => (prefs ? planWeek(deals, prefs, { days, filters, budget: parsed.budget, overrides: week.overrides, avoid: week.avoid }) : []),
    [prefs, deals, days, filters, parsed.budget, week.overrides, week.avoid],
  )
  const list = useMemo(() => (prefs ? buildShoppingList(plan, deals, prefs, { mode: listMode }) : null), [plan, deals, prefs, listMode])
  const listStores = useMemo(() => [...new Set(deals.map((d) => d.merchant).filter(Boolean))].sort(), [deals])

  const updatePrefs = (next) => {
    setPrefs(next)
    savePrefs(next).catch((e) => setError(e.message))
  }

  if (!prefs) return <p className="p-6 text-stone-500">Loading…</p>

  const area = data.region?.fsa || fsa(prefs.postalCode) || (data.region?.demo ? 'Demo' : 'Set area')
  const day = plan.find((d) => d.key === selected) || plan[0]

  // Edits to one meal of one day
  const override = (key, fn) =>
    editWeek((w) => ({ ...w, overrides: { ...w.overrides, [key]: fn(w.overrides[key] || {}) } }))
  // Swap one ingredient in each of these meals (one meal from a card, all of them from the list).
  const swapIn = (uses, item, fromList) =>
    editWeek((w) => {
      const old = uses[0].line.ing.item
      const avoid = fromList ? [...new Set([...(w.avoid || []), old])].filter((x) => x !== item) : w.avoid || []
      const overrides = { ...w.overrides }
      for (const { meal, line } of uses) {
        const fills = Object.fromEntries(meal.lines.map((l) => [l.slot, l.ing.item]))
        overrides[meal.key] = { ...overrides[meal.key], template: meal.template.id, fills: { ...fills, [line.slot]: item } }
      }
      return { ...w, overrides, avoid }
    })
  const pickIdea = (meal, idea) =>
    override(meal.key, (o) => ({ ...o, skip: false, template: idea.template.id, fills: idea.fills }))
  const resetWeek = () => editWeek((w) => ({ ...w, overrides: {}, avoid: [] }))
  const toggleChip = (id) => setChips((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const weekCost = list.totalCost
  const overBudget = parsed.budget != null && weekCost > parsed.budget
  const enabled = prefs.meals || DEFAULT_PREFS.meals
  const dayMeals = day ? Object.values(day.meals).filter((m) => m.lines) : []
  const dayLines = dayMeals.flatMap((m) => m.lines)
  const dayCost = dayMeals.reduce((a, m) => a + m.cost * (m.batches || 1), 0)

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
            🏪 {prefs.stores.length ? `${prefs.stores.length} stores` : 'All stores'}
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
        <h2 className="text-lg font-semibold">
          Your week{' '}
          <button onClick={() => setPrinting(true)} className="ml-1 align-middle text-xs font-medium text-green-700">
            🖨 Print for the fridge
          </button>
        </h2>
        {(Object.keys(week.overrides).length > 0 || week.avoid?.length > 0) && (
          <button onClick={resetWeek} className="text-xs font-medium text-stone-500">
            Reset changes
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-stone-500">Loading deals…</p>
      ) : (
        <>
          <WeekStrip plan={plan} selected={day?.key} onPick={setSelected} />
          {day && (
            <section className="mt-4" aria-label={day.date.toLocaleDateString('en-CA', { weekday: 'long' })}>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-base font-semibold">
                  {day.short === 'Today' ? 'Today' : day.date.toLocaleDateString('en-CA', { weekday: 'long' })}
                  <span className="ml-1.5 text-sm font-normal text-stone-500">
                    {day.date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                </h3>
                {dayLines.length > 0 && (
                  <p className="text-xs text-stone-500">
                    {money(dayCost)} ·{' '}
                    <span className="text-green-700">
                      {dayLines.filter((l) => l.onSale).length}/{dayLines.length} from flyers
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {MEALS.filter((m) => enabled.includes(m.id)).map((m) => {
                  const entry = day.meals[m.id]
                  const key = `${day.key}|${m.id}`
                  return (
                    <MealCard
                      key={key}
                      label={m.label}
                      emoji={m.emoji}
                      entry={entry}
                      onSwapLine={(line) => setSwapping([{ meal: entry, line }])}
                      onAnother={() => setIdeaFor({ entry, label: m.label })}
                      onSkip={() => override(key, (o) => ({ ...o, skip: true }))}
                      onRestore={() => override(key, (o) => ({ ...o, skip: false }))}
                      onCook={() => override(key, (o) => ({ ...o, cook: true }))}
                      onProof={setProof}
                    />
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      <ListBar list={list} onOpen={() => setSheet('list')} />
      <ListSheet
        open={sheet === 'list'}
        onClose={() => setSheet(null)}
        list={list}
        mode={listMode}
        setMode={setListMode}
        stores={listStores}
        onStore={(homeStore) => updatePrefs({ ...prefs, homeStore })}
        checked={week.checked}
        onCheck={(k) => editWeek((w) => ({ ...w, checked: { ...w.checked, [k]: !w.checked[k] } }))}
        postalCode={prefs.postalCode}
        onProof={setProof}
        onSwap={(item) => setSwapping(item.uses)}
      />
      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} title="Household">
        <Preferences prefs={prefs} merchants={merchants} onChange={updatePrefs} />
      </Sheet>
      <Sheet open={!!swapping} onClose={() => setSwapping(null)} title={swapping ? `Swap ${swapping[0].line.ing.item}` : ''}>
        {swapping && swapping.length > 1 && (
          <p className="mb-3 text-xs text-stone-500">Swaps it in the {swapping.length} meals that use it and keeps it off this week's list.</p>
        )}
        {swapping && (
          <ul className="space-y-2">
            {(swapping.length === 1 ? swapOptions(swapping[0].meal, swapping[0].line, deals, prefs) : listSwapOptions(swapping, deals, prefs)).map((c) => {
              const current = c.ing.item === swapping[0].line.ing.item
              return (
                <li key={c.ing.item}>
                  <button
                    disabled={current}
                    onClick={() => {
                      if (swapping.length > 1) swapIn(c.fits, c.ing.item, true)
                      else swapIn(swapping, c.ing.item, false)
                      setSwapping(null)
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
                      current ? 'border-green-600 bg-green-50' : 'border-stone-200'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {cap(c.ing.item)} {current && <span className="text-xs font-normal text-green-700">· current</span>}
                      </span>
                      <span className="block truncate text-xs text-stone-500">
                        {c.deal ? dealName(c.deal.name) : 'Not in this week\'s flyers'}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {c.deal ? (
                        <>
                          <span className="block text-sm font-semibold text-green-700">{c.deal.priceLabel}</span>
                          <span className={`inline-block rounded-full px-1.5 text-[10px] font-medium ${storeTint(c.deal.merchant)}`}>
                            {c.deal.merchant}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-stone-400">reg. price</span>
                      )}
                      <span className="block text-[11px] text-stone-400">~{money(c.cost)} {swapping.length > 1 ? (c.fits.length < swapping.length ? `· ${c.fits.length} of ${swapping.length} meals` : 'for the week') : 'for this meal'}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Sheet>
      <IdeaSheet
        current={ideaFor?.entry}
        deals={deals}
        prefs={prefs}
        plan={plan}
        onPick={(idea) => {
          pickIdea(ideaFor.entry, idea)
          setIdeaFor(null)
        }}
        onClose={() => setIdeaFor(null)}
      />
      {printing && <PrintWeek plan={plan} list={list} meals={MEALS.filter((m) => enabled.includes(m.id))} prefs={prefs} onClose={() => setPrinting(false)} />}
      <FlyerProof deal={proof} onClose={() => setProof(null)} />
    </div>
  )
}
