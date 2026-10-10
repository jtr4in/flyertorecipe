import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { firebaseEnabled } from './lib/firebase'
import { DEFAULT_PREFS, EMPTY_WEEK, fsa, loadDeals, loadPrefs, loadRecipes, loadWeek, savePrefs, saveWeek } from './lib/data'
import { activeDeals, buildShoppingList, listSwapOptions, swapOptions, weekDays } from './lib/planner'
import { dealName, money, storeTint } from './lib/stores'
import { cap, MEALS, setRecipes } from './data/templates'
import Preferences from './components/Preferences'
import Sheet from './components/Sheet'
import ListSheet, { ListBar } from './components/ListSheet'
import FlyerProof from './components/FlyerProof'
import Welcome from './components/Welcome'
import Tour from './components/Tour'
import { withExtras } from './lib/extras'
import { followMatch, matchableDeals, tidyMatch } from './lib/priceMatch'
import { placeNeeds, withNeeds } from './lib/needs'
import NeedsSheet from './components/NeedsSheet'
import DinnerPlan from './components/DinnerPlan'
import { heroDeals, poolMeals, poolPlan, toPick } from './lib/anchors'
import {
  createHousehold, currentHousehold, householdLink, leaveHousehold, saveHousehold, saveHouseholdWeek, setHouseholdCheck, sharedPrefs, watchHousehold,
} from './lib/household'

export default function App() {
  const [prefs, setPrefs] = useState(null)
  const [data, setData] = useState({ deals: [], region: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chips, setChips] = useState([])
  const [sheet, setSheet] = useState(null) // 'settings' | 'list'
  const [swapping, setSwapping] = useState(null) // [{ meal, line }]: every meal the swap applies to
  const [swapAll, setSwapAll] = useState(true) // from a meal card: swap it in the other meals too
  const [listMode, setListMode] = useState('match')
  const [proof, setProof] = useState(null)
  const [welcome, setWelcome] = useState(false)
  const [touring, setTouring] = useState(false)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('plan')
  const flash = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500)
  }, [])

  // Shared household (?h= link): plan inputs and checkmarks live in one Firestore doc.
  const [hid, setHid] = useState(() => (firebaseEnabled ? currentHousehold() : null))
  const hidRef = useRef(hid)
  hidRef.current = hid
  const remote = useRef(null) // last { chips } seen from the household, to skip echo writes
  const fail = useCallback((e) => setError(e.message), [])

  const days = useMemo(() => weekDays(), [])
  const [week, setWeek] = useState(() => loadWeek(days[0].key))
  const editWeek = useCallback((fn) => setWeek((w) => {
    const next = fn(w)
    saveWeek(next)
    if (hidRef.current) saveHouseholdWeek(hidRef.current, next).catch(fail)
    return next
  }), [fail])
  const toggleCheck = (k) => {
    const value = !week.checked[k]
    setWeek((w) => {
      const next = { ...w, checked: { ...w.checked, [k]: value } }
      saveWeek(next)
      return next
    })
    if (hid) setHouseholdCheck(hid, k, value).catch(fail)
  }

  useEffect(() => {
    if (!hid) return
    return watchHousehold(
      hid,
      (d) => {
        if (!d) {
          setError('That shared plan no longer exists, so this phone has its own plan again.')
          leaveHousehold()
          setHid(null)
          return
        }
        if (d.prefs) setPrefs((p) => tidyMatch({ ...DEFAULT_PREFS, ...d.prefs, onboarded: p?.onboarded ?? false }))
        const stale = !d.week?.started || (Date.parse(days[0].key) - Date.parse(d.week.started)) / 864e5 >= 7
        if (stale) {
          const fresh = { ...EMPTY_WEEK, started: days[0].key }
          setWeek(fresh)
          saveHousehold(hid, { week: fresh }).catch(fail)
        } else {
          setWeek({ ...EMPTY_WEEK, ...d.week })
        }
        remote.current = { chips: d.chips || [] }
        setChips(remote.current.chips)
      },
      fail,
    )
  }, [hid, days, fail])

  // Filters are part of the shared plan too.
  useEffect(() => {
    if (!hid || !remote.current) return
    if (remote.current.chips.join() === chips.join()) return
    const t = setTimeout(() => saveHousehold(hid, { chips }).catch(fail), 400)
    return () => clearTimeout(t)
  }, [hid, chips, fail])

  const shareLink = async () => {
    let id = hid
    try {
      if (!id) {
        id = await createHousehold({ prefs: sharedPrefs(prefs), week, chips })
        setHid(id)
      }
    } catch (e) {
      flash("Couldn't create the shared link. Try again in a moment.")
      setError(e.message)
      return
    }
    const url = householdLink(id)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Our meal plan', text: 'Our meals and grocery list for the week. Tick things off as you go.', url })
        return
      }
    } catch (e) {
      if (e.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      flash('Link copied. Send it to your household.')
    } catch {
      window.prompt('Copy this link:', url)
    }
  }


  // Recipes added since this build ship through Firestore; the bundled set works offline.
  const [recipesVersion, setRecipesVersion] = useState(0)
  useEffect(() => {
    loadRecipes()
      .then((list) => list && setRecipes(list) && setRecipesVersion((v) => v + 1))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadPrefs()
      .then((p) => {
        // In a shared household its settings win; only "seen the tour" is this phone's own.
        setPrefs((prev) => (hidRef.current && prev ? { ...prev, onboarded: p.onboarded } : tidyMatch(p)))
        // New here: the setup quiz. Already set up, or joining someone's plan: just the tour.
        if (!p.onboarded) (p.postalCode || hidRef.current ? setTouring : setWelcome)(true)
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
    // Only a new postal area needs new deals, not each keystroke in the postal code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs ? fsa(prefs.postalCode) || 'none' : null])

  const merchants = useMemo(() => [...new Set(data.deals.map((d) => d.merchant).filter(Boolean))].sort(), [data.deals])

  const allDeals = useMemo(() => (prefs ? activeDeals(data.deals, { stores: prefs.stores }) : []), [prefs, data.deals])
  // Price matching at one store: plan only from the flyers that store's cashiers accept.
  const deals = useMemo(
    () => (prefs?.matchAt ? matchableDeals(allDeals, prefs.matchAt, prefs.matchExtras) : allDeals),
    [allDeals, prefs?.matchAt, prefs?.matchExtras],
  )
  // This week's protein deals, the household's picked dinners, and those dinners as the plan.
  const heroes = useMemo(() => (prefs ? heroDeals(deals, prefs) : []), [prefs, deals, recipesVersion])
  const pool = useMemo(() => (prefs ? poolMeals(week.dinners || [], deals, prefs) : []), [prefs, week.dinners, deals, recipesVersion])
  const plan = useMemo(() => poolPlan(pool), [pool])
  const baseList = useMemo(
    () => (prefs ? withExtras(buildShoppingList(plan, listMode === 'single' ? allDeals : deals, prefs, { mode: listMode }), week.extras) : null),
    [plan, deals, allDeals, prefs, listMode, week.extras],
  )
  // The "we need" list: what meals didn't use goes on the list as its own lines.
  const needs = useMemo(
    () => placeNeeds(week.needs || [], baseList, listMode === 'single' && baseList?.store ? allDeals.filter((d) => d.merchant === baseList.store) : deals),
    [week.needs, baseList, listMode, allDeals, deals],
  )
  const list = useMemo(() => withNeeds(baseList, needs.group), [baseList, needs.group])
  // Catalog items already on the grocery list, so recipes that reuse them can say so.
  const have = useMemo(() => new Set((baseList?.groups || []).flatMap((g) => g.items.map((i) => i.key))), [baseList])
  const listStores = useMemo(() => [...new Set(allDeals.map((d) => d.merchant).filter(Boolean))].sort(), [allDeals])

  const updatePrefs = (picked) => {
    const next = followMatch(picked, prefs)
    setPrefs(next)
    savePrefs(next).catch(fail)
    if (hid) saveHousehold(hid, { prefs: sharedPrefs(next) }).catch(fail)
  }

  if (!prefs) return <p className="p-6 text-stone-500">Loading…</p>

  const finishWelcome = (tour) => {
    setWelcome(false)
    updatePrefs({ ...prefs, onboarded: true })
    if (tour) setTouring(true)
  }
  const endTour = () => {
    setTouring(false)
    if (!prefs.onboarded) updatePrefs({ ...prefs, onboarded: true })
  }

  const area = data.region?.fsa || fsa(prefs.postalCode) || (data.region?.demo ? 'Demo' : 'Set area')

  // Edits to one meal of one day
  const override = (key, fn) =>
    editWeek((w) => ({ ...w, overrides: { ...w.overrides, [key]: fn(w.overrides[key] || {}) } }))
  // Swap one ingredient in each of these meals (one meal from a card, all of them from the list).
  const swapIn = (uses, item, fromList) =>
    editWeek((w) => {
      const old = uses[0].line.ing.item
      const avoid = fromList ? [...new Set([...(w.avoid || []), old])].filter((x) => x !== item) : w.avoid || []
      const overrides = { ...w.overrides }
      const dinners = [...(w.dinners || [])]
      for (const { meal, line } of uses) {
        const fills = { ...Object.fromEntries(meal.lines.map((l) => [l.slot, l.ing.item])), [line.slot]: item }
        // A dinner from the pool keeps its swap in the pool; a day's meal in the overrides.
        if (meal.pick != null && dinners[meal.pick]) dinners[meal.pick] = { ...dinners[meal.pick], fills }
        else overrides[meal.key] = { ...overrides[meal.key], template: meal.template.id, fills }
      }
      return { ...w, overrides, avoid, dinners }
    })

  // A card's swap covers one meal; with "swap it everywhere" on, every meal using that item.
  const otherUses = swapping?.length === 1
    ? (list.groups.flatMap((g) => g.items).find((i) => i.key === swapping[0].line.ing.item)?.uses || []).filter((u) => u.meal.key !== swapping[0].meal.key)
    : []
  const swapUses = swapping && otherUses.length && swapAll ? [swapping[0], ...otherUses] : swapping

  const listView = (
    <ListSheet
      inline={tab === 'shop'}
      open={tab === 'shop' || sheet === 'list'}
      onClose={() => setSheet(null)}
      list={list}
      mode={listMode}
      setMode={setListMode}
      stores={listStores}
      onStore={(homeStore) => updatePrefs({ ...prefs, homeStore })}
      matchAt={prefs.matchAt || ''}
      matchExtras={prefs.matchExtras || []}
      onMatch={(matchAt, matchExtras) => updatePrefs({ ...prefs, matchAt, matchExtras })}
      checked={week.checked}
      onCheck={toggleCheck}
      onShareLink={firebaseEnabled ? shareLink : null}
      shared={!!hid}
      postalCode={prefs.postalCode}
      onProof={setProof}
      onSwap={(item) => setSwapping(item.uses)}
      onRemoveExtra={(item) =>
        editWeek((w) =>
          item.need
            ? { ...w, needs: (w.needs || []).filter((n) => `need:${n}` !== item.key) }
            : { ...w, extras: (w.extras || []).filter((x) => `extra:${x.deal.dealId}` !== item.key) },
        )
      }
    />
  )

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-32">
      <header className="sticky top-0 z-20 -mx-4 bg-stone-50/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-green-800">Flyer2Recipes</h1>
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
              Saving {money(list.totalSavings)}
            </span>
            <button
              onClick={() => setTouring(true)}
              aria-label="How this works"
              title="How this works"
              className="flex size-7 items-center justify-center rounded-full bg-white text-sm font-semibold text-green-700 shadow-sm"
            >
              ?
            </button>
          </span>
        </div>
        <button
          data-tour="household"
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

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-stone-200/70 p-1 text-sm font-semibold" role="tablist" data-tour="tabs">
        {[['plan', '🍽️ Plan'], ['shop', `🛒 Shop · ${list.itemCount}`]].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-xl py-2 ${tab === id ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'shop' ? (
        <>
          <button
            data-tour="plan"
            onClick={() => setSheet('needs')}
            className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm"
          >
            <span className="text-xl" aria-hidden>
              📝
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold">Add other</span>
            <span className="text-stone-400">›</span>
          </button>
          <div className="mt-4">{listView}</div>
        </>
      ) : loading ? (
        <p className="text-stone-500">Loading deals…</p>
      ) : (
        <>
          <DinnerPlan
            heroes={heroes}
            deals={deals}
            prefs={prefs}
            anchors={week.anchors || []}
            anchorDeals={week.anchorDeals || {}}
            have={have}
            pool={pool}
            itemCount={list.itemCount}
            onAnchors={(anchors, anchorDeals) => editWeek((w) => ({ ...w, anchors, anchorDeals }))}
            onAdd={(m) => editWeek((w) => ({ ...w, dinners: [...(w.dinners || []), toPick(m)] }))}
            onRemove={(i) => editWeek((w) => ({ ...w, dinners: (w.dinners || []).filter((_, j) => j !== i) }))}
            onReplace={(i, m) => editWeek((w) => ({ ...w, dinners: (w.dinners || []).map((p, j) => (j === i ? { ...toPick(m), leftovers: p.leftovers } : p)) }))}
            onLeftovers={(i, on) => editWeek((w) => ({ ...w, dinners: (w.dinners || []).map((p, j) => (j === i ? { ...p, leftovers: on } : p)) }))}
            onShop={() => {
              setTab('shop')
              window.scrollTo(0, 0)
            }}
          />
        </>
      )}

      {tab !== 'shop' && listView}

      <NeedsSheet
        open={sheet === 'needs'}
        onClose={() => setSheet(null)}
        needs={week.needs || []}
        status={needs.status}
        deals={listMode === 'single' && baseList?.store ? allDeals.filter((d) => d.merchant === baseList.store) : deals}
        onChange={(next) => editWeek((w) => ({ ...w, needs: next }))}
      />
      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} title="Household">
        <Preferences prefs={prefs} merchants={merchants} onChange={updatePrefs} />
        {firebaseEnabled && (
          <section className="mt-6 rounded-2xl bg-stone-100 p-4">
            <h3 className="text-sm font-medium">Share with your household</h3>
            <p className="mt-1 text-xs text-stone-600">
              {hid
                ? 'This plan is shared. Everyone with the link sees the same meals and list, and checkmarks show up live.'
                : 'Send a link so your partner sees the same meals and grocery list, and can tick things off while you shop.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={shareLink} className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white">
                {hid ? 'Send the link again' : 'Share this plan'}
              </button>
              {hid && (
                <button
                  onClick={() => {
                    leaveHousehold()
                    setHid(null)
                    remote.current = null
                    flash('This phone has its own plan again.')
                  }}
                  className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600"
                >
                  Stop sharing on this phone
                </button>
              )}
            </div>
          </section>
        )}
      </Sheet>
      <Sheet open={!!swapping} onClose={() => setSwapping(null)} title={swapping ? `Swap ${swapping[0].line.ing.item}` : ''}>
        {otherUses.length > 0 && (
          <label className="mb-3 flex items-start gap-3 rounded-2xl bg-amber-50 p-3">
            <input type="checkbox" className="mt-0.5 size-4 accent-green-700" checked={swapAll} onChange={(e) => setSwapAll(e.target.checked)} />
            <span className="text-sm">
              <span className="font-medium">
                Swap it in all {otherUses.length + 1} meals that use {swapping[0].line.ing.item}
              </span>
              <span className="block text-xs text-stone-600">So you don't buy both. Unchecked, only this meal changes.</span>
            </span>
          </label>
        )}
        {swapping && swapping.length > 1 && (
          <p className="mb-3 text-xs text-stone-500">Swaps it in the {swapping.length} meals that use it and keeps it off this week's list.</p>
        )}
        {swapUses && (
          <ul className="space-y-2">
            {(swapUses.length === 1 ? swapOptions(swapUses[0].meal, swapUses[0].line, deals, prefs) : listSwapOptions(swapUses, deals, prefs)).map((c) => {
              const current = c.ing.item === swapping[0].line.ing.item
              return (
                <li key={c.ing.item}>
                  <button
                    disabled={current}
                    onClick={() => {
                      if (swapUses.length > 1) swapIn(c.fits, c.ing.item, true)
                      else swapIn(swapUses, c.ing.item, false)
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
                      <span className="block text-[11px] text-stone-400">~{money(c.cost)} {swapUses.length > 1 ? (c.fits.length < swapUses.length ? `· ${c.fits.length} of ${swapUses.length} meals` : 'for the week') : 'for this meal'}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Sheet>
      <FlyerProof deal={proof} onClose={() => setProof(null)} />
      {welcome && <Welcome prefs={prefs} merchants={merchants} needsPostal={firebaseEnabled} onChange={updatePrefs} onDone={finishWelcome} />}
      <Tour open={touring && !welcome && !loading} onClose={endTour} />
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4" role="status">
          <p className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</p>
        </div>
      )}
    </div>
  )
}
