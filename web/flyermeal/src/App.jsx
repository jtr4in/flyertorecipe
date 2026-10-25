import { useCallback, useEffect, useMemo, useState } from 'react'
import { fsa, loadDeals } from '@f2r/lib/data'
import { describesOther } from '@f2r/lib/needs'
import { activeDeals } from '@f2r/lib/planner'
import { followMatch, otherProvince, tidyMatch } from '@f2r/lib/priceMatch'
import { bestDeal } from './lib/deals'
import { poundsFor } from './lib/estimate'
import { recommend } from './lib/recommend'
import { norm, prepare, scoreRecipe, sortRecipes, withSwap } from './lib/match'
import ListTab from './components/ListTab'
import RecipesTab from './components/RecipesTab'
import FiltersSheet from './components/FiltersSheet'

// Device-local on purpose: this is a test app, and a list is scratch state.
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode: just won't persist */
  }
}

const fold = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function App() {
  const [tab, setTab] = useState('list')
  const [postal, setPostal] = useState(() => read('fm.postal', ''))
  const [list, setList] = useState(() => read('fm.list', [])) // [{ name, checked, dealId, meals: [recipe id] }]
  const [meals, setMeals] = useState(() => read('fm.meals', [])) // recipe ids you're shopping for
  const [shortcuts, setShortcuts] = useState(() => read('fm.shortcuts', [])) // recipe ids made with the store-bought sauce
  const [openId, setOpenId] = useState(null) // recipe showing on the Recipes tab
  const [allDeals, setDeals] = useState([])
  // Same store filters as Flyer2Recipes: the store you price match at, and which flyers to use.
  const [filters, setFilters] = useState(() => tidyMatch({ matchAt: '', matchExtras: [], stores: [], ...read('fm.filters', {}) }))
  const [filtering, setFiltering] = useState(false)
  const [dealState, setDealState] = useState('idle') // idle | loading | ready | none | error
  const [recipes, setRecipes] = useState(null)
  const [groups, setGroups] = useState([])

  useEffect(() => write('fm.list', list), [list])
  useEffect(() => write('fm.meals', meals), [meals])
  useEffect(() => write('fm.shortcuts', shortcuts), [shortcuts])
  useEffect(() => write('fm.postal', postal), [postal])
  useEffect(() => write('fm.filters', filters), [filters])

  useEffect(() => {
    if (!fsa(postal)) return
    let live = true
    setDealState('loading')
    loadDeals(postal)
      .then(({ deals: all, region }) => {
        if (!live) return
        const now = activeDeals(all)
        setDeals(now)
        setDealState(region && now.length ? 'ready' : 'none')
      })
      .catch(() => live && setDealState('error'))
    return () => {
      live = false
    }
  }, [postal])

  // The recipe library is a stored file (built by a GitHub Action from TheMealDB and our own
  // classics), so there's no recipe API call here and no quota to run out.
  useEffect(() => {
    fetch('recipes.json')
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.meta?.groups || [])
        setRecipes(prepare(d.recipes || []))
      })
      .catch(() => setRecipes([]))
  }, [])

  // Near Ottawa, Flipp also sends Gatineau's Quebec flyers; Ontario stores won't price match them,
  // so they're left out unless asked for.
  const quebec = useMemo(() => allDeals.filter((d) => otherProvince(d, postal)).length, [allDeals, postal])
  const local = useMemo(() => ((filters.quebec && !filters.matchAt) || !quebec ? allDeals : allDeals.filter((d) => !otherProvince(d, postal))), [allDeals, postal, quebec, filters.quebec, filters.matchAt])
  // Everything (list matches, suggestions, the flyer wall, recipe prices) uses only these flyers.
  const deals = useMemo(() => (filters.stores.length ? local.filter((d) => filters.stores.includes(d.merchant)) : local), [local, filters.stores])
  // Match the everyday suggestions against this week's ads while the page is idle, so adding the
  // first item doesn't stall on it.
  useEffect(() => {
    if (!deals.length) return
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = idle(() => recommend([], deals))
    return () => cancel(id)
  }, [deals])
  const merchants = useMemo(() => {
    const n = new Map()
    for (const d of local) n.set(d.merchant, (n.get(d.merchant) || 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1]).map(([m]) => m)
  }, [local])

  // `meal` is the recipe id the items are for, so the list can say what each one is for.
  const add = useCallback((names, dealId, meal) => {
    const items = (Array.isArray(names) ? names : [names]).map((n) => n.trim()).filter(Boolean)
    setList((cur) => {
      const next = [...cur]
      for (const name of items) {
        const at = next.findIndex((i) => fold(i.name) === fold(name))
        if (at >= 0) {
          const had = next[at].meals || []
          if (meal && !had.includes(meal)) next[at] = { ...next[at], meals: [...had, meal] }
          continue
        }
        next.push({ name, checked: false, dealId: dealId || null, meals: meal ? [meal] : [] })
      }
      return next
    })
  }, [])
  const saveMeal = useCallback((id, on = true) => {
    setMeals((cur) => (on ? (cur.includes(id) ? cur : [...cur, id]) : cur.filter((m) => m !== id)))
    // Unsaving a meal keeps its groceries, just without the "for" note.
    if (!on) setList((cur) => cur.map((i) => (i.meals?.includes(id) ? { ...i, meals: i.meals.filter((m) => m !== id) } : i)))
  }, [])
  // Taking a recipe's store-bought shortcut takes the ingredients it replaces off the list, unless
  // they're there for another meal too (or already in the cart).
  const takeShortcut = useCallback((recipe, on) => {
    setShortcuts((cur) => (on ? [...new Set([...cur, recipe.id])] : cur.filter((id) => id !== recipe.id)))
    if (!on) return
    const gone = new Set((recipe.swaps?.[0]?.replaces || []).map(fold))
    setList((cur) =>
      cur.flatMap((i) => {
        if (!gone.has(fold(i.name)) || !i.meals?.includes(recipe.id) || i.checked) return [i]
        const meals = i.meals.filter((m) => m !== recipe.id)
        return meals.length ? [{ ...i, meals }] : []
      }),
    )
  }, [])
  const update = useCallback((name, patch) => setList((cur) => cur.map((i) => (i.name === name ? { ...i, ...patch } : i))), [])
  const remove = useCallback((name) => setList((cur) => cur.filter((i) => i.name !== name)), [])
  const clear = useCallback(() => (setList([]), setMeals([])), [])

  // Each list line with its deal: the one picked, else the best plain match this week.
  const byId = useMemo(() => new Map(deals.map((d) => [d.dealId, d])), [deals])
  // A remembered ad that turns out to be something else (spaghetti squash for spaghetti, from
  // before the matching knew better) is matched again.
  const pinned = useCallback((i) => {
    const d = i.dealId && byId.get(i.dealId)
    return d && !describesOther(i.name.toLowerCase(), d) ? d : null
  }, [byId])
  const lines = useMemo(() => list.map((i) => ({ ...i, deal: pinned(i) || bestDeal(i.name, deals) })), [list, deals, pinned])

  // Remember the ad each item was matched to, so a reload (or a re-ordered flyer download) shows
  // the same deal. An item is re-matched only when its ad has left this week's flyers, not when a
  // store filter hides it.
  const live = useMemo(() => new Set(allDeals.map((d) => d.dealId)), [allDeals])
  useEffect(() => {
    if (dealState !== 'ready') return
    const stale = (l) => !l.dealId || !live.has(l.dealId) || (byId.has(l.dealId) && !pinned(l))
    const pin = new Map(lines.filter((l) => l.deal && stale(l) && l.dealId !== l.deal.dealId).map((l) => [l.name, l.deal.dealId]))
    if (pin.size) setList((cur) => cur.map((i) => (pin.has(i.name) ? { ...i, dealId: pin.get(i.name) } : i)))
  }, [lines, live, dealState, byId, pinned])

  const keys = useMemo(() => [...new Set(list.map((i) => norm(i.name)))].filter(Boolean), [list])
  // Every recipe, the ones you already have the most of first.
  const sorted = useMemo(() => (recipes ? sortRecipes(recipes, keys) : []), [recipes, keys])
  const saved = useMemo(
    () =>
      meals
        .map((id) => sorted.find((s) => s.recipe.id === id))
        .filter(Boolean)
        .map((s) => (shortcuts.includes(s.recipe.id) && s.recipe.swaps?.[0] ? { ...scoreRecipe(withSwap(s.recipe, s.recipe.swaps[0]), keys), recipe: s.recipe } : s)),
    [meals, sorted, shortcuts, keys],
  )
  // How much of each list item the saved meals call for, in pounds, so per-pound prices can be costed.
  const pounds = useMemo(() => {
    const out = {}
    for (const i of list) {
      let lb = 0
      for (const id of i.meals || []) {
        const ing = recipes?.find((r) => r.id === id)?.ingredients.find((x) => fold(x.name) === fold(i.name))
        lb += (ing && poundsFor(ing.name, ing.measure)) || 0
      }
      if (lb) out[i.name] = lb
    }
    return out
  }, [list, recipes])
  const mealName = useCallback((id) => recipes?.find((r) => r.id === id)?.name, [recipes])

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-stone-50 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:max-w-2xl">
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-stone-50/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-orange-600">Flyer</span> Meal
          </h1>
          <PostalChip postal={postal} onChange={setPostal} state={dealState} count={deals.length} />
        </div>
      </header>

      <main className="px-4 pt-4">
        {tab === 'list' ? (
          <ListTab
            postal={postal}
            setPostal={setPostal}
            dealState={dealState}
            deals={deals}
            filters={filters}
            openFilters={() => setFiltering(true)}
            lines={lines}
            meals={saved}
            pounds={pounds}
            mealName={mealName}
            openMeal={(id) => (setOpenId(id), setTab('recipes'))}
            removeMeal={(id) => saveMeal(id, false)}
            add={add}
            update={update}
            remove={remove}
            clear={clear}
          />
        ) : (
          <RecipesTab sorted={sorted} groups={groups} loading={!recipes} list={list} keys={keys} deals={deals} add={add} meals={meals} saveMeal={saveMeal} shortcuts={shortcuts} takeShortcut={takeShortcut} openId={openId} setOpenId={setOpenId} />
        )}
      </main>

      <FiltersSheet
        open={filtering}
        onClose={() => setFiltering(false)}
        filters={filters}
        merchants={merchants}
        quebec={quebec}
        onChange={(next) => setFilters((prev) => followMatch(next, prev))}
      />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-md sm:max-w-2xl">
          <TabButton active={tab === 'list'} onClick={() => setTab('list')} icon="📝" label="List" badge={list.length || null} />
          <TabButton active={tab === 'recipes'} onClick={() => setTab('recipes')} icon="🍳" label="Recipes" />
        </div>
      </nav>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${active ? 'text-orange-600' : 'text-stone-500'}`}
    >
      <span className="relative text-xl leading-none">
        {icon}
        {badge != null && (
          <span className="absolute -top-1.5 -right-4 min-w-5 rounded-full bg-orange-600 px-1.5 text-[11px] leading-5 font-bold text-white">{badge}</span>
        )}
      </span>
      {label}
    </button>
  )
}

function PostalChip({ postal, onChange, state, count }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(postal)
  if (!postal && !editing) return null
  if (editing)
    return (
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (fsa(value)) {
            onChange(value.toUpperCase().replace(/\s+/g, ''))
            setEditing(false)
          }
        }}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="K1A 0B1"
          className="w-24 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm uppercase"
          aria-label="Postal code"
        />
        <button className="rounded-full bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white">Save</button>
      </form>
    )
  return (
    <button onClick={() => (setValue(postal), setEditing(true))} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm">
      📍 {fsa(postal)}
      <span className="ml-1.5 text-stone-400">{state === 'loading' ? '…' : state === 'ready' ? `${count.toLocaleString()} deals` : ''}</span>
    </button>
  )
}
