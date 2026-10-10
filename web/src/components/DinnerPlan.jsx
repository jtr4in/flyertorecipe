// Plan by dinners: pick 1–2 of the week's best protein deals, choose dinners built around
// them, and keep 3–4 in a pool (no days). Then "Generate my list" moves on to shopping.
import { useMemo, useState } from 'react'
import FlyerClip from './FlyerClip'
import { anchorMeals, quickMeal } from '../lib/anchors'
import { dealName, money, storeTint } from '../lib/stores'

const TARGET = 4

// Some flyers shout every name ("CHICKEN DRUMSTICKS"); show those in sentence case.
const calm = (t) => (/[a-z]/.test(t) ? t : t.charAt(0) + t.slice(1).toLowerCase())

const GROUP_LABELS = {
  poultry: ['🐔', 'Chicken & turkey'],
  pork: ['🐖', 'Pork'],
  ground: ['🍔', 'Ground meat'],
  fish: ['🐟', 'Fish & seafood'],
  plantProtein: ['🌱', 'Beans, lentils & tofu'],
  eggs: ['🥚', 'Eggs'],
}

function HeroCard({ hero, on, onToggle, big }) {
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

function Ingredients({ meal }) {
  return (
    <div className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-600">
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

function OptionCard({ meal, added, onAdd, onSwap, label }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3">
      {label && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">{label}</p>}
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-2.5 text-left">
        <span className="text-2xl" aria-hidden>
          {meal.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug">{meal.name}</span>
          <span className="block text-xs text-stone-500">
            {meal.minutes} min · {money(meal.cost / meal.servings)}/serving ·{' '}
            <span className="text-green-700">
              {meal.onSale}/{meal.lines.length} on sale
            </span>
          </span>
        </span>
      </button>
      {open && <Ingredients meal={meal} />}
      <div className="mt-2 flex gap-2">
        <button
          onClick={onAdd}
          disabled={added}
          className={`flex-1 rounded-xl py-1.5 text-xs font-semibold ${added ? 'bg-green-100 text-green-800' : 'bg-green-700 text-white'}`}
        >
          {added ? '✓ In your dinners' : '+ Add to my dinners'}
        </button>
        {onSwap && (
          <button onClick={onSwap} className="rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700">
            🔄 Swap
          </button>
        )}
      </div>
    </div>
  )
}

function PoolCard({ meal, n, onRemove, onSwap, onLeftovers }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">{n}</span>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold leading-snug">
            <span aria-hidden>{meal.emoji}</span> {meal.name}
          </span>
          <span className="block text-xs text-stone-500">
            {meal.minutes} min · {money((meal.cost * (meal.batches || 1)) / meal.servings / (meal.batches || 1))}/serving
            {meal.batches > 1 && ' · cooking double'}
          </span>
        </button>
        <button onClick={onRemove} className="px-1 text-stone-400" aria-label={`Remove ${meal.name}`}>
          ✕
        </button>
      </div>
      {open && <Ingredients meal={meal} />}
      <div className="mt-2 flex items-center gap-3 pl-8 text-xs">
        <button onClick={onSwap} className="font-medium text-green-700">
          🔄 Swap
        </button>
        <label className="flex items-center gap-1.5 text-stone-600">
          <input type="checkbox" className="size-3.5 accent-green-700" checked={meal.batches > 1} onChange={(e) => onLeftovers(e.target.checked)} />
          Make extra for lunch
        </label>
      </div>
    </li>
  )
}

export default function DinnerPlan({ heroes, deals, prefs, anchors, pool, onAnchors, onAdd, onRemove, onReplace, onLeftovers, onShop, itemCount }) {
  const [openGroups, setOpenGroups] = useState([]) // protein types showing every deal
  const [shift, setShift] = useState({}) // how far each protein's options have been swapped along
  const [all, setAll] = useState({}) // proteins showing every dinner, not just two
  const options = useMemo(
    () => Object.fromEntries(anchors.map((item) => [item, anchorMeals(item, deals, prefs)])),
    [anchors, deals, prefs],
  )
  const inPool = new Set(pool.map((m) => m.name))
  const toggle = (item) => onAnchors(anchors.includes(item) ? anchors.filter((x) => x !== item) : [...anchors, item])
  const heroOf = (item) => heroes.find((h) => h.item === item)
  // One section per kind of protein, in the order of its best deal (heroes come sorted).
  const groups = [...heroes.reduce((m, h) => m.set(h.group, [...(m.get(h.group) || []), h]), new Map())]
  // A tapped protein's dinners, shown right under its card.
  const dinnersFor = (item) => {
    const opts = options[item] || []
    if (!opts.length) return null
    const k = shift[item] || 0
    const shown = [opts[k % opts.length], opts[(k + 1) % opts.length]].filter((m, i, a) => m && a.indexOf(m) === i)
    const quick = quickMeal(opts)
    const h = heroOf(item)
    return (
      <section key={item} className="ml-3 border-l-2 border-green-700/30 pl-3">
        <p className="mb-2 text-xs text-stone-500">Dinners with {h ? calm(dealName(h.deal.name)) : item}, built from the other things on sale.</p>
        <div className="space-y-2">
          {shown.map((m, i) => (
            <OptionCard
              key={m.template.id}
              meal={m}
              added={inPool.has(m.name)}
              onAdd={() => onAdd(m)}
              onSwap={opts.length > 2 ? () => setShift({ ...shift, [item]: k + (i === 0 ? 2 : 1) }) : null}
            />
          ))}
          {quick && !shown.includes(quick) && !all[item] && (
            <OptionCard meal={quick} label="⚡ Quick, low-effort" added={inPool.has(quick.name)} onAdd={() => onAdd(quick)} />
          )}
          {all[item] &&
            opts
              .filter((m) => !shown.includes(m))
              .map((m) => <OptionCard key={m.template.id} meal={m} label={m === quick ? '⚡ Quick, low-effort' : null} added={inPool.has(m.name)} onAdd={() => onAdd(m)} />)}
          {opts.length > shown.length + (quick && !shown.includes(quick) ? 1 : 0) && (
            <button onClick={() => setAll({ ...all, [item]: !all[item] })} className="text-sm font-medium text-green-700">
              {all[item] ? 'Show fewer' : `See all ${opts.length} dinners`}
            </button>
          )}
        </div>
      </section>
    )
  }

  // A pooled dinner's swap: the next dish around the same protein that isn't already picked.
  const nextFor = (m) => {
    const opts = m.anchor ? anchorMeals(m.anchor, deals, prefs) : []
    const i = opts.findIndex((o) => o.template.id === m.template.id)
    return [...opts.slice(i + 1), ...opts.slice(0, Math.max(0, i))].find((o) => !inPool.has(o.name)) || null
  }

  return (
    <div className="space-y-6">
      <section data-tour="heroes">
        <h2 className="text-lg font-semibold">What's on sale?</h2>
        <p className="mb-3 text-sm text-stone-500">This week's best protein deals. Tap one or two to see dinners built around them.</p>
        {heroes.length === 0 ? (
          <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-500">No protein deals in your flyers yet this week.</p>
        ) : (
          <div className="space-y-5">
            {groups.map(([group, list]) => {
              const isOpen = openGroups.includes(group)
              const shown = isOpen ? list : list.filter((h, i) => i === 0 || anchors.includes(h.item))
              const hidden = list.length - shown.length
              const [emoji, label] = GROUP_LABELS[group] || ['🍽️', group]
              return (
                <div key={group}>
                  <h3 className="mb-1.5 text-sm font-semibold text-stone-700">
                    <span aria-hidden>{emoji}</span> {label}
                  </h3>
                  <div className="space-y-2">
                    {shown.map((h, i) => (
                      <div key={h.item} className="space-y-2">
                        <HeroCard hero={h} big={i === 0} on={anchors.includes(h.item)} onToggle={() => toggle(h.item)} />
                        {anchors.includes(h.item) && dinnersFor(h.item)}
                      </div>
                    ))}
                    {(hidden > 0 || (isOpen && list.length > 1)) && (
                      <button
                        onClick={() => setOpenGroups(isOpen ? openGroups.filter((g) => g !== group) : [...openGroups, group])}
                        aria-expanded={isOpen}
                        className="flex items-center gap-1 text-sm font-medium text-green-700"
                      >
                        {isOpen ? `Fewer ${label.toLowerCase()}` : `More ${label.toLowerCase()} (${hidden})`}
                        <span aria-hidden className={`inline-block transition ${isOpen ? 'rotate-180' : ''}`}>
                          ▾
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section data-tour="pool">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Your dinners</h2>
          <span className="text-sm text-stone-500">
            {pool.length} of {TARGET}
          </span>
        </div>
        <p className="mb-3 text-xs text-stone-500">
          No days to stick to. Most households cook 3–4 dinners a week and fill the rest with leftovers and quick basics.
        </p>
        {pool.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">Pick a protein above, then add the dinners you like.</p>
        ) : (
          <ul className="space-y-2">
            {pool.map((m, i) => (
              <PoolCard
                key={m.key}
                meal={m}
                n={i + 1}
                onRemove={() => onRemove(m.pick)}
                onSwap={() => {
                  const next = nextFor(m)
                  if (next) onReplace(m.pick, next)
                }}
                onLeftovers={(on) => onLeftovers(m.pick, on)}
              />
            ))}
          </ul>
        )}
      </section>

      {pool.length > 0 && (
        <div className="sticky bottom-4 z-10">
          <button onClick={onShop} className="w-full rounded-2xl bg-green-700 py-3.5 text-base font-semibold text-white shadow-lg">
            Generate my list · {itemCount} items
          </button>
        </div>
      )}
    </div>
  )
}
