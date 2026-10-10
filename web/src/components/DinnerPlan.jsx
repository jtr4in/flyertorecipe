// Plan the week's meals with no days attached. Dinners: pick 1–2 of the week's best protein deals
// and choose dinners built around them. Breakfasts and lunches: pick from recipes that lean on
// what's on sale and what's already on the list. Then "Generate my list" moves on to shopping.
import { useMemo, useState } from 'react'
import FlyerClip from './FlyerClip'
import { anchorMeals, FILTERS, heroDeals, mealOptions, passesFilters, quickMeal, sharedCount } from '../lib/anchors'
import { cap } from '../data/templates'
import { SAUCES, sauceIngredient } from '../data/sauces'
import { matchDeal } from '../lib/planner'
import { dealName, money, storeTint } from '../lib/stores'

const TARGET = 4
const MEALS = [
  ['breakfast', '🍳 Breakfast'],
  ['lunch', '🥪 Lunch'],
  ['dinner', '🍽️ Dinner'],
]

// Some flyers shout every name ("CHICKEN DRUMSTICKS"); show those in sentence case.
const calm = (t) => (/[a-z]/.test(t) ? t : t.charAt(0) + t.slice(1).toLowerCase())
// Lowercase without accents, so "poulet haché" matches "hache".
const fold = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function HeroCard({ hero, on, onToggle, big = false }) {
  const d = hero.deal
  const pct = Math.round(hero.pct * 100)
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-white text-left transition ${big ? 'p-3' : 'px-3 py-2'} ${
        on ? 'border-green-700 ring-2 ring-green-700' : 'border-stone-200'
      }`}
    >
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-50 ${big ? 'h-16 w-16' : 'h-12 w-12'}`}>
        {d.imageUrl ? (
          <img src={d.imageUrl} alt="" loading="lazy" className={`object-contain ${big ? 'max-h-16 max-w-16' : 'max-h-12 max-w-12'}`} />
        ) : d.clip?.box ? (
          <FlyerClip deal={d} sharp={big ? 200 : 160} maxHeight={big ? '4rem' : '3rem'} />
        ) : (
          <span className={big ? 'text-2xl' : 'text-xl'} aria-hidden>
            🥩
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug">{calm(dealName(d.name))}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-bold text-green-700">{d.priceLabel || d.priceText}</span>
          <span className={`rounded-full px-1.5 text-[10px] font-medium ${storeTint(d.merchant)}`}>{d.merchant}</span>
          {pct > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900">{pct}% off</span>}
        </span>
      </span>
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-sm ${on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 text-transparent'}`}>
        ✓
      </span>
    </button>
  )
}

const youtube = (name) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`How to Make ${name}`)}`

export function Ingredients({ meal }) {
  return (
    <div className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-600">
      <a
        href={youtube(meal.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
      >
        <span aria-hidden>▶</span> Watch how to make it
      </a>
      <ul className="space-y-0.5">
        {meal.lines.map((l) => (
          <li key={l.slot}>
            {l.ing.item}
            {l.deal ? (
              <span className="text-green-700">
                {' '}
                · {l.deal.priceLabel || l.deal.priceText} at {l.deal.merchant}
              </span>
            ) : (
              <span className="text-stone-400"> · regular price</span>
            )}
          </li>
        ))}
      </ul>
      <ol className="mt-2 list-decimal space-y-1 pl-4">
        {meal.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

function OptionCard({ meal, added, onAdd, label, shared = 0 }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-2.5">
      <div className="flex items-center gap-2.5">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className="text-xl" aria-hidden>
            {meal.emoji}
          </span>
          <span className="min-w-0 flex-1">
            {label && <span className="block text-[10px] font-semibold uppercase tracking-wide text-amber-700">{label}</span>}
            <span className="block text-sm font-semibold leading-snug">{meal.name}</span>
            <span className="block text-xs text-stone-500">
              {meal.minutes} min · {money(meal.cost / meal.servings)}/serving ·{' '}
              <span className="text-green-700">
                {meal.onSale}/{meal.lines.length} on sale
              </span>
              {shared > 0 && <span className="text-sky-700"> · 🛒 {shared} on your list</span>}
            </span>
          </span>
        </button>
        <button
          onClick={onAdd}
          disabled={added}
          aria-label={added ? `${meal.name} is in your meals` : `Add ${meal.name} to my meals`}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${added ? 'bg-green-100 text-green-800' : 'bg-green-700 text-white'}`}
        >
          {added ? '✓ Added' : '+ Add'}
        </button>
      </div>
      {open && <Ingredients meal={meal} />}
    </div>
  )
}

function PoolCard({ meal, n, deals, onRemove, onSwap, onLeftovers, onJar, leftovers = true }) {
  const [open, setOpen] = useState(false)
  const sauce = SAUCES[meal.template.id]
  const jarDeal = sauce && (meal.jar ? meal.lines.find((l) => l.slot === 'jar')?.deal : matchDeal(sauceIngredient(meal.template.id), deals))
  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">{n}</span>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold leading-snug">
            <span aria-hidden>{meal.emoji}</span> {meal.name}
          </span>
          <span className="block text-xs text-stone-500">
            {meal.meal !== 'dinner' && `${meal.meal === 'breakfast' ? 'Breakfast' : 'Lunch'} · `}
            {meal.minutes} min · {money((meal.cost * (meal.batches || 1)) / meal.servings / (meal.batches || 1))}/serving
            {meal.batches > 1 && ' · cooking double'}
          </span>
        </button>
        <button onClick={onRemove} className="px-1 text-stone-400" aria-label={`Remove ${meal.name}`}>
          ✕
        </button>
      </div>
      {open && <Ingredients meal={meal} />}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-8 text-xs">
        <button onClick={onSwap} className="font-medium text-green-700">
          🔄 Swap
        </button>
        {leftovers && (
          <label className="flex items-center gap-1.5 text-stone-600">
            <input type="checkbox" className="size-3.5 accent-green-700" checked={meal.batches > 1} onChange={(e) => onLeftovers(e.target.checked)} />
            Make extra for lunch
          </label>
        )}
        {sauce && onJar && (
          <label className="flex items-center gap-1.5 text-stone-600">
            <input type="checkbox" className="size-3.5 accent-green-700" checked={!!meal.jar} onChange={(e) => onJar(e.target.checked)} />
            <span>
              Use store-bought {sauce.sauce}
              {jarDeal && <span className="text-green-700"> · {jarDeal.priceLabel || jarDeal.priceText} at {jarDeal.merchant}</span>}
            </span>
          </label>
        )}
      </div>
    </li>
  )
}

export default function DinnerPlan({ recipesVersion = 0, deals, prefs, anchors, anchorDeals = {}, have = new Set(), pool, onAnchors, onAdd, onRemove, onReplace, onLeftovers, onJar, onShop, itemCount }) {
  const [openGroups, setOpenGroups] = useState([]) // protein types showing every deal
  const [tab, setTab] = useState('dinner')
  const [filters, setFilters] = useState([])
  const [showAll, setShowAll] = useState(false) // every breakfast / lunch, not just the top few
  const [all, setAll] = useState({}) // proteins showing every dinner, not just two
  const [q, setQ] = useState('') // search box over this tab's sale items
  const [poolOpen, setPoolOpen] = useState(false) // the picked meals, folded away while browsing
  // This tab's sale items to plan around: proteins for dinner, cereal, yogurt... for breakfast.
  const heroes = useMemo(() => heroDeals(deals, prefs, tab), [deals, prefs, tab, recipesVersion])
  // Chosen items are saved per meal ("eggs" for dinner, "breakfast|eggs" for breakfast).
  const keyOf = (item) => (tab === 'dinner' ? item : `${tab}|${item}`)
  // Which deal was tapped for each chosen item (several stores can have chicken breasts).
  const heroOf = (item) =>
    heroes.find((h) => h.item === item && h.deal.dealId === anchorDeals[keyOf(item)]) || heroes.find((h) => h.item === item)
  const chosen = heroes.filter((h, i, a) => anchors.includes(keyOf(h.item)) && a.findIndex((x) => x.item === h.item) === i).map((h) => h.item)
  const options = useMemo(
    () => Object.fromEntries(chosen.map((item) => [item, anchorMeals(item, deals, prefs, heroOf(item)?.deal, tab)])),
    [chosen.join(), anchorDeals, deals, prefs, heroes, tab],
  )
  const inPool = new Set(pool.map((m) => m.name))
  const counts = Object.fromEntries(MEALS.map(([id]) => [id, pool.filter((m) => m.meal === id).length]))
  const order = MEALS.map(([id]) => id)
  const sortedPool = [...pool].sort((a, b) => order.indexOf(a.meal) - order.indexOf(b.meal))
  const picks = useMemo(
    () => (tab === 'dinner' ? [] : mealOptions(tab, deals, prefs, { have, filters })),
    // `have` is rebuilt each render; its contents are what matter.
    [tab, deals, prefs, filters, [...have].sort().join()],
  )
  const isOn = (h) => anchors.includes(keyOf(h.item)) && heroOf(h.item) === h
  const toggle = (h) => {
    const k = keyOf(h.item)
    const { [k]: _, ...rest } = anchorDeals
    if (isOn(h)) onAnchors(anchors.filter((x) => x !== k), rest)
    else onAnchors(anchors.includes(k) ? anchors : [...anchors, k], { ...rest, [k]: h.deal.dealId })
  }
  const noun = tab === 'dinner' ? 'dinners' : tab === 'breakfast' ? 'breakfasts' : 'lunches'
  // One section per kind of item, in the order of its best deal (heroes come sorted).
  // Every typed word has to appear in the item, its group or the flyer name ("breasts", "ground").
  const words = fold(q).split(/[\s,]+/).filter(Boolean).map((w) => (w.length > 3 ? w.replace(/e?s$/, '') : w))
  const found = words.length ? heroes.filter((h) => words.every((w) => fold(`${h.item} ${h.label} ${h.deal.name}`).includes(w))) : heroes
  const groups = [...found.reduce((m, h) => m.set(h.group, [...(m.get(h.group) || []), h]), new Map())]
  // A tapped protein's dinners, shown right under its card.
  const dinnersFor = (item) => {
    const opts = (options[item] || [])
      .filter((m) => passesFilters(m.template, filters))
      .sort((a, b) => sharedCount(b, have) - sharedCount(a, have))
    if (!opts.length)
      return (options[item] || []).length ? (
        <p className="ml-3 border-l-2 border-green-700/30 pl-3 text-xs text-stone-500">No {noun} with this one match your filters.</p>
      ) : null
    const shown = opts.slice(0, 2)
    const quick = quickMeal(opts)
    return (
      <section key={item} className="ml-3 border-l-2 border-green-700/30 pl-3">
        <p className="mb-2 text-xs text-stone-500">{cap(noun)} built around it, using other things on sale.</p>
        <div className="space-y-2">
          {shown.map((m) => (
            <OptionCard key={m.template.id} meal={m} shared={sharedCount(m, have)} added={inPool.has(m.name)} onAdd={() => onAdd(m)} />
          ))}
          {quick && !shown.includes(quick) && !all[item] && (
            <OptionCard meal={quick} shared={sharedCount(quick, have)} label="⚡ Quick, low-effort" added={inPool.has(quick.name)} onAdd={() => onAdd(quick)} />
          )}
          {all[item] &&
            opts
              .filter((m) => !shown.includes(m))
              .map((m) => <OptionCard key={m.template.id} meal={m} shared={sharedCount(m, have)} label={m === quick ? '⚡ Quick, low-effort' : null} added={inPool.has(m.name)} onAdd={() => onAdd(m)} />)}
          {opts.length > shown.length + (quick && !shown.includes(quick) ? 1 : 0) && (
            <button onClick={() => setAll({ ...all, [item]: !all[item] })} className="text-sm font-medium text-green-700">
              {all[item] ? 'Show fewer' : `See all ${opts.length} ${noun}`}
            </button>
          )}
        </div>
      </section>
    )
  }

  // A pooled dinner's swap: the next dish around the same protein that isn't already picked.
  const nextFor = (m) => {
    const meal = m.template.meal
    const opts = m.anchor ? anchorMeals(m.anchor, deals, prefs, meal === tab ? heroOf(m.anchor)?.deal : null, meal) : mealOptions(meal, deals, prefs, { have })
    const i = opts.findIndex((o) => o.template.id === m.template.id)
    return [...opts.slice(i + 1), ...opts.slice(0, Math.max(0, i))].find((o) => !inPool.has(o.name)) || null
  }

  return (
    <div className="space-y-5">
      <section data-tour="pool">
        <button
          onClick={() => setPoolOpen(!poolOpen)}
          aria-expanded={poolOpen}
          disabled={!pool.length}
          className="flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-left"
        >
          <span className="text-sm font-semibold">Your meals</span>
          <span className="min-w-0 flex-1 truncate text-xs text-stone-500">
            {pool.length ? `${counts.dinner} of ${TARGET} dinners${pool.length > counts.dinner ? ` · ${pool.length - counts.dinner} more` : ''}` : 'Pick a deal below, then add meals'}
          </span>
          {pool.length > 0 && (
            <span aria-hidden className={`inline-block text-green-700 transition ${poolOpen ? 'rotate-180' : ''}`}>
              ▾
            </span>
          )}
        </button>
        {!poolOpen || pool.length === 0 ? null : (
          <ul className="mt-2 space-y-2">
            {sortedPool.map((m, i) => (
              <PoolCard
                key={m.key}
                meal={m}
                n={i + 1}
                leftovers={m.meal === 'dinner'}
                onRemove={() => onRemove(m.pick)}
                onSwap={() => {
                  const next = nextFor(m)
                  if (next) onReplace(m.pick, next)
                }}
                onLeftovers={(on) => onLeftovers(m.pick, on)}
                deals={deals}
                onJar={onJar && ((on) => onJar(m.pick, on))}
              />
            ))}
          </ul>
        )}
      </section>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1 text-sm font-medium" role="tablist" aria-label="Meal">
          {MEALS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id)
                setShowAll(false)
                setQ('')
              }}
              className={`rounded-xl py-2 ${tab === id ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}
            >
              {label}
              {counts[id] > 0 && <span className="ml-1 text-xs text-green-700">· {counts[id]}</span>}
            </button>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filters">
          {FILTERS.map(([id, label]) => {
            const on = filters.includes(id)
            return (
              <button
                key={id}
                aria-pressed={on}
                onClick={() => setFilters(on ? filters.filter((f) => f !== id) : [...filters, id])}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm ${on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>


      <section data-tour="heroes">
        <h2 className="text-lg font-semibold">What's on sale?</h2>
        <p className="mb-2 text-sm text-stone-500">Tap a deal to see {noun} built around it.</p>
        {heroes.length > 0 && (
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'dinner' ? 'Search: breasts, ground, salmon…' : tab === 'breakfast' ? 'Search: bacon, yogurt, cereal…' : 'Search: ham, bread, soup…'}
            aria-label="Search sale items"
            className="mb-3 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        )}
        {heroes.length === 0 ? (
          <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">Nothing for {tab} in your flyers yet this week.</p>
        ) : found.length === 0 ? (
          <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">No {tab === 'dinner' ? 'protein' : tab} deals match "{q}" this week.</p>
        ) : (
          <div className="space-y-5">
            {groups.map(([group, list]) => {
              const isOpen = words.length > 0 || openGroups.includes(group)
              const shown = isOpen ? list : list.filter((h, i) => i === 0 || isOn(h))
              const { emoji, label } = list[0]
              return (
                <div key={group}>
                  <h3 className="mb-1.5 text-sm font-semibold text-stone-700">
                    {list.length > 1 ? (
                      <button
                        onClick={() => setOpenGroups(isOpen ? openGroups.filter((g) => g !== group) : [...openGroups, group])}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-1.5 text-left"
                      >
                        <span aria-hidden>{emoji}</span> {label}
                        <span className="text-xs font-normal text-stone-500">({list.length})</span>
                        <span aria-hidden className={`ml-auto inline-block text-green-700 transition ${isOpen ? 'rotate-180' : ''}`}>
                          ▾
                        </span>
                      </button>
                    ) : (
                      <>
                        <span aria-hidden>{emoji}</span> {label}
                      </>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {shown.map((h, i) => (
                      <div key={h.deal.dealId ?? h.deal.name} className="space-y-2">
                        <HeroCard hero={h} on={isOn(h)} onToggle={() => toggle(h)} />
                        {isOn(h) && dinnersFor(h.item)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {tab !== 'dinner' && (
        <section>
          <button onClick={() => setShowAll(!showAll)} aria-expanded={showAll} className="flex items-center gap-1 text-sm font-medium text-green-700">
            {showAll ? `Hide all ${noun}` : `Browse all ${noun} (${picks.length})`}
            <span aria-hidden className={`inline-block transition ${showAll ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          {!showAll ? null : picks.length === 0 ? (
            <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">Nothing matches your filters. Try turning one off.</p>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-stone-500">Ones that reuse what's already on your list come first.</p>
              {picks.map((m) => (
                <OptionCard key={m.template.id} meal={m} shared={m.shared} added={inPool.has(m.name)} onAdd={() => onAdd(m)} />
              ))}
            </div>
          )}
        </section>
      )}


      {pool.length > 0 && (
        <div className="pointer-events-none sticky bottom-4 z-10 flex justify-end">
          <button onClick={onShop} className="pointer-events-auto rounded-full bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-lg">
            🛒 See my list · {itemCount}
          </button>
        </div>
      )}
    </div>
  )
}

/** The week's picked meals on the Shop tab: folded away, each opens to its recipe. */
export function MealsCard({ pool }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(null)
  if (!pool.length) return null
  return (
    <section className="mb-3 rounded-2xl border border-stone-200 bg-white">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-2.5 text-left">
        <span className="min-w-0 flex-1 text-sm font-semibold">
          🍽️ Your meals · {pool.length}
          {!open && <span className="block truncate text-xs font-normal text-stone-500">{pool.map((m) => m.name).join(', ')}</span>}
        </span>
        <span aria-hidden className={`text-green-700 transition ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {pool.map((m, i) => (
            <li key={i} className="px-4 py-2">
              <button onClick={() => setShown(shown === i ? null : i)} aria-expanded={shown === i} className="flex w-full items-center gap-2 text-left">
                <span aria-hidden>{m.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">{m.name}</span>
                  <span className="block text-xs text-stone-500">
                    {m.meal !== 'dinner' && `${m.meal === 'breakfast' ? 'Breakfast' : 'Lunch'} · `}
                    {m.minutes} min
                  </span>
                </span>
                <span className="text-xs text-green-700">{shown === i ? 'Hide' : 'Recipe'}</span>
              </button>
              {shown === i && <Ingredients meal={m} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
