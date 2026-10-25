import { useMemo, useState } from 'react'
import Sheet from '@f2r/components/Sheet'
import { dealName } from '@f2r/lib/stores'
import { bestDeal } from '../lib/deals'
import { scoreRecipe, withSwap } from '../lib/match'

const fold = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const ICON = {
  Pasta: '🍝', Chicken: '🍗', Beef: '🥩', Pork: '🐖', Seafood: '🐟', Vegetarian: '🥦',
  'Soups & stews': '🍲', Breakfast: '🍳', 'Sides & salads': '🥗', Desserts: '🍰',
}
const ROW = 10 // recipes per row on the browse page before "See all"

/** A deal for a recipe ingredient, only when the flyer item really names it ("lime" → limes). */
function saleFor(key, deals, memo) {
  if (memo.has(key)) return memo.get(key)
  const d = bestDeal(key, deals)
  const last = key.split(' ').at(-1)
  const ok = d && new RegExp(`(^|[^a-z])${last}(s|es)?([^a-z]|$)`).test(fold(dealName(d.name)))
  memo.set(key, ok ? d : null)
  return memo.get(key)
}

export default function RecipesTab({ sorted, groups, loading, list, keys, deals, add, meals, saveMeal, shortcuts, takeShortcut, openId, setOpenId }) {
  const [group, setGroup] = useState(null)
  const [q, setQ] = useState('')
  const open = openId && sorted.find((s) => s.recipe.id === openId)?.recipe
  const setOpen = (r) => setOpenId(r ? r.id : null)
  const memo = useMemo(() => new Map(), [deals])
  const byGroup = useMemo(() => {
    const m = new Map(groups.map((g) => [g, []]))
    for (const s of sorted) (m.get(s.recipe.group) || m.set(s.recipe.group, []).get(s.recipe.group)).push(s)
    return m
  }, [sorted, groups])

  if (loading) return <p className="py-10 text-center text-stone-400">Loading recipes…</p>

  const words = fold(q).split(/\s+/).filter(Boolean)
  const found = words.length ? sorted.filter((s) => words.every((w) => fold(s.recipe.name).includes(w))) : null
  const best = keys.length ? sorted.filter((s) => s.uses > 0).slice(0, ROW) : []
  const pick = (g) => {
    setGroup(g)
    setQ('')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="space-y-5">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${sorted.length} recipes, like lasagna`}
        aria-label="Search recipes"
        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
      />
      {!found && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Meal type">
          <Chip active={!group} onClick={() => pick(null)} label="All" />
          {[...byGroup].filter(([, v]) => v.length).map(([g]) => (
            <Chip key={g} active={group === g} onClick={() => pick(group === g ? null : g)} label={`${ICON[g] || ''} ${g}`} />
          ))}
        </div>
      )}

      {found ? (
        found.length ? (
          <Grid items={found} onOpen={setOpen} />
        ) : (
          <p className="rounded-3xl bg-white p-6 text-center text-sm text-stone-500">No recipe called that yet. Try a main ingredient, like chicken.</p>
        )
      ) : group ? (
        <section>
          <h2 className="mb-1 text-lg font-bold">
            {ICON[group]} {group}
          </h2>
          {keys.length > 0 && <p className="mb-3 text-sm text-stone-500">The ones that use the most of your list come first.</p>}
          <Grid items={byGroup.get(group) || []} onOpen={setOpen} />
        </section>
      ) : (
        <>
          {best.length > 0 && <Row title="Uses the most of your list" items={best} onOpen={setOpen} />}
          {[...byGroup].filter(([, v]) => v.length).map(([g, items]) => (
            <Row key={g} title={`${ICON[g] || ''} ${g}`} items={items} onOpen={setOpen} onAll={items.length > ROW ? () => pick(g) : null} />
          ))}
        </>
      )}
      <p className="pb-2 text-center text-xs text-stone-400">Recipes from TheMealDB and Flyer Meal. Photos from TheMealDB and Wikimedia Commons.</p>

      {open && <RecipeSheet key={open.id} recipe={open} onClose={() => setOpen(null)} deals={deals} memo={memo} add={add} list={list} keys={keys} saved={meals.includes(open.id)} saveMeal={saveMeal} store={shortcuts.includes(open.id)} setStore={(on) => takeShortcut(open, on)} />}
    </div>
  )
}

function Chip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${active ? 'border-orange-600 bg-orange-600 text-white' : 'border-stone-200 bg-white text-stone-700'}`}
    >
      {label}
    </button>
  )
}

function Row({ title, items, onOpen, onAll }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {onAll && (
          <button onClick={onAll} className="shrink-0 text-sm font-medium text-orange-700">
            See all {items.length} ›
          </button>
        )}
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {items.slice(0, ROW).map((s) => (
          <li key={s.recipe.id} className="w-36 shrink-0 snap-start">
            <Card s={s} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Grid({ items, onOpen }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((s) => (
        <li key={s.recipe.id}>
          <Card s={s} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}

export function Photo({ recipe, big }) {
  const src = big ? recipe.image : recipe.thumb || recipe.image
  if (src) return <img src={src} alt={big ? recipe.name : ''} loading="lazy" className={`w-full bg-stone-100 object-cover ${big ? 'aspect-[4/3] rounded-2xl' : 'aspect-square'}`} />
  return (
    <div className={`flex w-full items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50 ${big ? 'aspect-[4/3] rounded-2xl text-7xl' : 'aspect-square text-5xl'}`} aria-hidden="true">
      {recipe.emoji || ICON[recipe.group] || '🍽️'}
    </div>
  )
}

function Card({ s, onOpen }) {
  const have = s.lines.filter((l) => l.status === 'list').length
  const need = s.lines.filter((l) => l.status === 'need').length
  return (
    <button onClick={() => onOpen(s.recipe)} className="block w-full overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm active:scale-[0.98]">
      <Photo recipe={s.recipe} />
      <div className="p-2">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-tight font-semibold">{s.recipe.name}</p>
        {have > 0 ? (
          <p className="mt-0.5 truncate text-xs font-medium text-green-700">✓ {have} on your list</p>
        ) : (
          <p className="mt-0.5 truncate text-xs text-stone-400">{need ? `${need} to buy` : 'Pantry only'}</p>
        )}
      </div>
    </button>
  )
}

const STATUS = {
  list: { icon: '✓', cls: 'bg-green-100 text-green-800', label: 'On your list' },
  pantry: { icon: '🏠', cls: 'bg-stone-100 text-stone-600', label: 'Likely in your kitchen' },
  need: { icon: '+', cls: 'bg-orange-100 text-orange-700', label: 'To buy' },
}

function RecipeSheet({ recipe, onClose, deals, memo, add, list, keys, saved, saveMeal, store, setStore }) {
  const swap = recipe.swaps?.[0]
  const patch = store && swap?.steps // step number → its store-bought version, or null to skip it
  const steps = recipe.steps
    .map((text, i) => (patch && String(i + 1) in patch ? { text: patch[String(i + 1)], changed: true } : { text }))
    .filter((st) => st.text !== null)
  const score = scoreRecipe(withSwap(recipe, store && swap), keys)
  const onList = (name) => list.some((i) => i.name.toLowerCase() === name.toLowerCase())
  const status = (l) => (l.status === 'need' && onList(l.name) ? 'list' : l.status)
  const toBuy = score.lines.filter((l) => status(l) === 'need')
  const order = { list: 0, need: 1, pantry: 2 }
  const lines = [...score.lines].sort((a, b) => order[status(a)] - order[status(b)])
  const facts = [recipe.minutes && `${recipe.minutes >= 120 ? `${Math.round(recipe.minutes / 60)} hours` : `${recipe.minutes} min`}`, recipe.serves && `Serves ${recipe.serves}`, recipe.area && recipe.area !== 'Unknown' && recipe.area]
    .filter(Boolean)
    .join(' · ')

  return (
    <Sheet
      open
      tall
      onClose={onClose}
      title={recipe.name}
      footer={
        toBuy.length > 0 ? (
          <button
            onClick={() => {
              toBuy.forEach((l) => add(l.name.toLowerCase(), saleFor(l.key, deals, memo)?.dealId, recipe.id))
              saveMeal(recipe.id)
            }}
            className="w-full rounded-2xl bg-orange-600 py-3 font-semibold text-white"
          >
            Add {toBuy.length} {toBuy.length === 1 ? 'ingredient' : 'ingredients'} to my list
          </button>
        ) : saved ? (
          <p className="py-2 text-center font-semibold text-green-700">✓ In your meals, and everything's on your list</p>
        ) : (
          <button onClick={() => saveMeal(recipe.id)} className="w-full rounded-2xl bg-orange-600 py-3 font-semibold text-white">
            Save to my meals
          </button>
        )
      }
    >
      <Photo recipe={recipe} big />
      <p className="mt-1 text-[11px] text-stone-400">
        {recipe.credit ? (
          <>
            Photo:{' '}
            <a href={recipe.credit.url} target="_blank" rel="noreferrer" className="underline">
              {recipe.credit.by}, {recipe.credit.licence}
            </a>
            , via Wikimedia Commons
          </>
        ) : recipe.id.startsWith('mealdb:') ? (
          'Recipe and photo from TheMealDB'
        ) : null}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">{facts}</p>
        <button
          onClick={() => saveMeal(recipe.id, !saved)}
          aria-pressed={saved}
          className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${saved ? 'border-green-200 bg-green-50 text-green-800' : 'border-orange-200 text-orange-700'}`}
        >
          {saved ? '✓ In my meals' : '+ Save meal'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {recipe.youtube && (
          <a href={recipe.youtube} target="_blank" rel="noreferrer" className="rounded-full bg-red-50 px-3 py-1.5 font-medium text-red-700">
            ▶ Watch the video
          </a>
        )}
        {recipe.source && (
          <a href={recipe.source} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-3 py-1.5 font-medium text-stone-700">
            Original recipe ↗
          </a>
        )}
      </div>

      {swap && (
        <div className={`mt-4 rounded-2xl border p-3 ${store ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <p className="text-sm font-semibold">{store ? `Using store-bought ${swap.sauce}` : 'Short on time?'}</p>
          <p className="mt-0.5 text-sm text-stone-600">
            {store
              ? `One ${swap.measure.replace(/^1 /, '')} replaces ${swap.replaces.length} ingredients.`
              : `This recipe makes its ${swap.sauce.endsWith('dough') ? 'dough' : swap.sauce.endsWith('seasoning') ? 'seasoning' : 'sauce'} from scratch. You can buy it ready-made instead.`}
          </p>
          <button
            onClick={() => setStore(!store)}
            aria-pressed={store}
            className={`mt-2 rounded-full px-4 py-1.5 text-sm font-semibold ${store ? 'border border-stone-300 bg-white text-stone-700' : 'bg-orange-600 text-white'}`}
          >
            {store ? 'Make it from scratch' : swap.label}
          </button>
        </div>
      )}

      <h3 className="mt-5 mb-2 font-semibold">Ingredients</h3>
      <ul className="space-y-1.5">
        {lines.map((l, i) => {
          const st = status(l)
          const s = STATUS[st]
          const deal = st === 'need' || l.swapped ? saleFor(l.key, deals, memo) : null
          return (
            <li key={i} className="flex items-center gap-3">
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm ${s.cls}`} title={s.label}>
                {s.icon}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{l.name}</span>
                {l.swapped && <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-800">Store-bought</span>}
                {l.measure && <span className="text-stone-400"> · {l.measure}</span>}
                {deal && (
                  <span className="block text-xs text-green-700">
                    {deal.priceLabel} at {deal.merchant}
                  </span>
                )}
              </div>
              {st !== 'list' && (
                <button
                  onClick={() => add(l.name.toLowerCase(), deal?.dealId, recipe.id)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${st === 'need' ? 'border-orange-200 text-orange-700' : 'border-stone-200 text-stone-500'}`}
                  aria-label={`Add ${l.name} to my list`}
                >
                  + Add
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {store && <p className="mt-2 text-xs text-stone-400">Not needed now: {swap.replaces.join(', ')}.</p>}
      <p className="mt-2 text-xs text-stone-400">🏠 means most kitchens have it already, like salt, oil and garlic.</p>

      <h3 className="mt-5 mb-2 font-semibold">How to make it</h3>
      {store && !patch && <p className="mb-3 rounded-2xl bg-green-50 p-3 text-sm text-green-900">{swap.note}</p>}
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
        {steps.map((st, i) => (
          <li key={i} className={st.changed ? '-ml-1 rounded-lg bg-green-50 py-1 pr-2 pl-1 text-green-900' : ''}>
            {st.text}
          </li>
        ))}
      </ol>
      {patch && <p className="mt-2 text-xs text-stone-400">Steps in green are changed for the store-bought {swap.sauce}.</p>}
    </Sheet>
  )
}
