import { useMemo, useState } from 'react'
import Sheet from '@f2r/components/Sheet'
import { bestDeal } from '../lib/deals'
import { norm } from '../lib/match'
import { dealName } from '@f2r/lib/stores'

// TheMealDB serves smaller copies of each photo at /small and /medium.
const thumb = (url, size = 'small') => (url ? `${url}/${size}` : '')
const fold = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** A deal for a recipe ingredient, only when the flyer item really names it ("lime" → limes). */
function saleFor(key, deals, memo) {
  if (memo.has(key)) return memo.get(key)
  const d = bestDeal(key, deals)
  const last = key.split(' ').at(-1)
  const ok = d && new RegExp(`(^|[^a-z])${last}(s|es)?([^a-z]|$)`).test(fold(dealName(d.name)))
  memo.set(key, ok ? d : null)
  return memo.get(key)
}

export default function RecipesTab({ ranked, loading, list, deals, add, toList }) {
  const [category, setCategory] = useState(null)
  const [open, setOpen] = useState(null)
  const memo = useMemo(() => new Map(), [deals])
  const categories = useMemo(() => {
    const n = new Map()
    for (const s of ranked) n.set(s.recipe.category, (n.get(s.recipe.category) || 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1])
  }, [ranked])
  const shown = category ? ranked.filter((s) => s.recipe.category === category) : ranked

  if (loading) return <p className="py-10 text-center text-stone-400">Loading recipes…</p>
  if (!list.length)
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-6 text-center">
        <p className="font-semibold">Add a few groceries first</p>
        <p className="mt-1 text-sm text-stone-500">We'll show recipes that use what's on your list, plus things most kitchens already have.</p>
        <button onClick={toList} className="mt-4 rounded-2xl bg-orange-600 px-5 py-2.5 font-semibold text-white">
          Go to my list
        </button>
      </div>
    )
  if (!ranked.length)
    return <p className="rounded-3xl bg-white p-6 text-center text-sm text-stone-500">No recipes use these items yet. Try adding a protein or a vegetable, like chicken thighs or zucchini.</p>

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Recipe type">
        <Chip active={!category} onClick={() => setCategory(null)} label={`All ${ranked.length}`} />
        {categories.map(([c, n]) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)} label={`${c} ${n}`} />
        ))}
      </div>

      <ul className="space-y-3">
        {shown.map((s) => {
          const uses = [...new Set(s.lines.filter((l) => l.status === 'list').map((l) => list.find((i) => norm(i.name) === l.from)?.name || l.from))]
          const need = s.lines.filter((l) => l.status === 'need')
          const sale = need.filter((l) => saleFor(l.key, deals, memo)).length
          return (
            <li key={s.recipe.id}>
              <button onClick={() => setOpen(s)} className="flex w-full gap-3 overflow-hidden rounded-3xl border border-stone-200 bg-white p-2 text-left shadow-sm active:scale-[0.99]">
                <img src={thumb(s.recipe.image)} alt="" loading="lazy" className="h-24 w-24 shrink-0 rounded-2xl bg-stone-100 object-cover" />
                <div className="min-w-0 py-1 pr-1">
                  <p className="line-clamp-2 leading-snug font-semibold">{s.recipe.name}</p>
                  <p className="text-xs text-stone-400">
                    {s.recipe.area && s.recipe.area !== 'Unknown' ? `${s.recipe.area} · ` : ''}
                    {s.recipe.category}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-green-700">✓ Uses your {uses.join(', ')}</p>
                  <p className="line-clamp-1 text-sm text-stone-500">
                    {need.length ? (
                      <>
                        Need {need.length} more{sale > 0 && <span className="text-orange-600"> · {sale} on sale</span>}
                      </>
                    ) : (
                      'Nothing else to buy'
                    )}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="pb-2 text-center text-xs text-stone-400">Recipes and photos from TheMealDB</p>

      <RecipeSheet score={open} onClose={() => setOpen(null)} deals={deals} memo={memo} add={add} list={list} />
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

const STATUS = {
  list: { icon: '✓', cls: 'bg-green-100 text-green-800', label: 'On your list' },
  pantry: { icon: '🏠', cls: 'bg-stone-100 text-stone-600', label: 'Likely in your kitchen' },
  need: { icon: '+', cls: 'bg-orange-100 text-orange-700', label: 'To buy' },
}

function RecipeSheet({ score, onClose, deals, memo, add, list }) {
  if (!score) return <Sheet open={false} onClose={onClose} />
  const r = score.recipe
  const onList = (name) => list.some((i) => i.name.toLowerCase() === name.toLowerCase())
  const need = score.lines.filter((l) => l.status === 'need' && !onList(l.name))
  const order = { list: 0, need: 1, pantry: 2 }
  const lines = [...score.lines].sort((a, b) => order[a.status] - order[b.status])
  return (
    <Sheet
      open
      tall
      onClose={onClose}
      title={r.name}
      footer={
        need.length > 0 && (
          <button
            onClick={() => need.forEach((l) => add(l.name.toLowerCase(), saleFor(l.key, deals, memo)?.dealId))}
            className="w-full rounded-2xl bg-orange-600 py-3 font-semibold text-white"
          >
            Add {need.length} missing {need.length === 1 ? 'item' : 'items'} to my list
          </button>
        )
      }
    >
      <img src={thumb(r.image, 'medium')} alt={r.name} className="aspect-[4/3] w-full rounded-2xl bg-stone-100 object-cover" />
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {r.youtube && (
          <a href={r.youtube} target="_blank" rel="noreferrer" className="rounded-full bg-red-50 px-3 py-1.5 font-medium text-red-700">
            ▶ Watch the video
          </a>
        )}
        {r.source && (
          <a href={r.source} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-3 py-1.5 font-medium text-stone-700">
            Original recipe ↗
          </a>
        )}
      </div>

      <h3 className="mt-5 mb-2 font-semibold">Ingredients</h3>
      <ul className="space-y-1.5">
        {lines.map((l, i) => {
          const s = STATUS[onList(l.name) && l.status === 'need' ? 'list' : l.status]
          const deal = l.status === 'need' ? saleFor(l.key, deals, memo) : null
          return (
            <li key={i} className="flex items-center gap-3">
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm ${s.cls}`} title={s.label}>
                {s.icon}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{l.name}</span>
                {l.measure && <span className="text-stone-400"> · {l.measure}</span>}
                {deal && (
                  <span className="block text-xs text-green-700">
                    {deal.priceLabel} at {deal.merchant}
                  </span>
                )}
              </div>
              {l.status === 'need' && !onList(l.name) && (
                <button onClick={() => add(l.name.toLowerCase(), deal?.dealId)} className="shrink-0 rounded-full border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700">
                  + Add
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-stone-400">🏠 means most kitchens have it already, like salt, oil and garlic.</p>

      <h3 className="mt-5 mb-2 font-semibold">How to make it</h3>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
        {r.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </Sheet>
  )
}
