import { useCallback, useEffect, useMemo, useState } from 'react'
import { fsa, loadDeals } from '@f2r/lib/data'
import { activeDeals } from '@f2r/lib/planner'
import { bestDeal } from './lib/deals'
import { norm, prepare, sortRecipes } from './lib/match'
import ListTab from './components/ListTab'
import RecipesTab from './components/RecipesTab'

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
  const [list, setList] = useState(() => read('fm.list', [])) // [{ name, checked, dealId }]
  const [deals, setDeals] = useState([])
  const [dealState, setDealState] = useState('idle') // idle | loading | ready | none | error
  const [recipes, setRecipes] = useState(null)
  const [groups, setGroups] = useState([])

  useEffect(() => write('fm.list', list), [list])
  useEffect(() => write('fm.postal', postal), [postal])

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

  const add = useCallback((names, dealId) => {
    const items = (Array.isArray(names) ? names : [names]).map((n) => n.trim()).filter(Boolean)
    setList((cur) => {
      const next = [...cur]
      for (const name of items) {
        if (next.some((i) => fold(i.name) === fold(name))) continue
        next.push({ name, checked: false, dealId: dealId || null })
      }
      return next
    })
  }, [])
  const update = useCallback((name, patch) => setList((cur) => cur.map((i) => (i.name === name ? { ...i, ...patch } : i))), [])
  const remove = useCallback((name) => setList((cur) => cur.filter((i) => i.name !== name)), [])
  const clear = useCallback(() => setList([]), [])

  // Each list line with its deal: the one picked, else the best plain match this week.
  const byId = useMemo(() => new Map(deals.map((d) => [d.dealId, d])), [deals])
  const lines = useMemo(
    () => list.map((i) => ({ ...i, deal: (i.dealId && byId.get(i.dealId)) || bestDeal(i.name, deals) })),
    [list, deals, byId],
  )

  const keys = useMemo(() => [...new Set(list.map((i) => norm(i.name)))].filter(Boolean), [list])
  // Every recipe, the ones you already have the most of first.
  const sorted = useMemo(() => (recipes ? sortRecipes(recipes, keys) : []), [recipes, keys])

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
            lines={lines}
            add={add}
            update={update}
            remove={remove}
            clear={clear}
          />
        ) : (
          <RecipesTab sorted={sorted} groups={groups} loading={!recipes} list={list} keys={keys} deals={deals} add={add} />
        )}
      </main>

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
