import { useEffect, useMemo, useState } from 'react'
import { firebaseEnabled } from './lib/firebase'
import { DEFAULT_PREFS, loadDeals, loadPrefs, savePrefs } from './lib/data'
import { activeDeals, buildShoppingList, planWeek } from './lib/planner'
import { RECIPES } from './data/recipes'
import Preferences from './components/Preferences'
import MealPlan from './components/MealPlan'
import ShoppingList from './components/ShoppingList'

const TABS = [
  { id: 'plan', label: 'Meal plan' },
  { id: 'list', label: 'Shopping list' },
  { id: 'prefs', label: 'Household' },
]

export default function App() {
  const [prefs, setPrefs] = useState(null)
  const [data, setData] = useState({ deals: [], region: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('plan')

  useEffect(() => {
    loadPrefs()
      .then((p) => {
        setPrefs(p)
        if (firebaseEnabled && !p.postalCode) setTab('prefs')
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

  const merchants = useMemo(
    () => [...new Set(data.deals.map((d) => d.merchant).filter(Boolean))].sort(),
    [data.deals],
  )

  const { plan, list, dealCount } = useMemo(() => {
    if (!prefs) return { plan: [], list: null, dealCount: 0 }
    const deals = activeDeals(data.deals, { stores: prefs.stores })
    const plan = planWeek(RECIPES, deals, prefs)
    return { plan, list: buildShoppingList(plan, deals, prefs), dealCount: deals.length }
  }, [prefs, data.deals])

  const updatePrefs = (next) => {
    setPrefs(next)
    savePrefs(next).catch((e) => setError(e.message))
  }

  if (!prefs) return <p className="p-6 text-stone-500">Loading…</p>

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-semibold text-green-800">Flyer2Recipes</h1>
          {list && (
            <p className="text-sm text-stone-600">
              Est. savings <span className="font-semibold text-green-700">${list.totalSavings.toFixed(2)}</span>
            </p>
          )}
        </div>
        <p className="text-xs text-stone-500">
          {data.region?.demo
            ? 'Demo data: add Firebase config to use real flyer deals.'
            : data.region
              ? `${dealCount} active deals near ${data.region.fsa}`
              : prefs.postalCode
                ? 'No deals loaded for this area yet.'
                : 'Set your postal code to load local deals.'}
        </p>
      </header>

      {error && <p className="mx-4 mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <main className="flex-1 px-4 pt-4 pb-24">
        {loading ? (
          <p className="text-stone-500">Loading deals…</p>
        ) : tab === 'plan' ? (
          <MealPlan plan={plan} prefs={prefs} />
        ) : tab === 'list' ? (
          <ShoppingList list={list} />
        ) : (
          <Preferences prefs={prefs} merchants={merchants} onChange={updatePrefs} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium ${
                tab === t.id ? 'text-green-700 border-t-2 border-green-700' : 'text-stone-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
