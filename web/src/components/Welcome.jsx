// First-run setup: a few one-question screens, then an offer to tour the main screen.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { DIET_TAGS } from '../lib/aisles'
import { DEFAULT_PREFS, fsa } from '../lib/data'
import { MEALS } from '../data/templates'
import { MATCH_STORES, PRICE_MATCH } from '../lib/priceMatch'

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

const Choice = ({ on, children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
      on ? 'border-green-700 bg-green-50 text-green-900 ring-1 ring-green-700' : 'border-stone-200 bg-white text-stone-700'
    }`}
  >
    {children}
  </button>
)

export default function Welcome({ prefs, merchants, needsPostal, onChange, onDone }) {
  const [step, setStep] = useState(0)
  const set = (patch) => onChange({ ...prefs, ...patch })
  const meals = prefs.meals || DEFAULT_PREFS.meals
  const [postal, setPostal] = useState(prefs.postalCode || '')
  const postalOk = !!fsa(postal)

  const screens = [
    {
      title: 'Plan your week from the flyers',
      body: (
        <ul className="space-y-3 text-sm text-stone-700">
          <li className="flex gap-3"><span className="text-2xl">🗞️</span>Every week we read the grocery flyers near you.</li>
          <li className="flex gap-3"><span className="text-2xl">🍽️</span>Then we plan breakfasts, lunches, dinners and snacks around what's on sale.</li>
          <li className="flex gap-3"><span className="text-2xl">🛒</span>You get one grocery list with the flyer ads to show the cashier.</li>
        </ul>
      ),
      next: "Let's set you up",
    },
    needsPostal && {
      title: "What's your postal code?",
      hint: 'So we use the flyers from stores near you.',
      body: (
        <input
          autoFocus
          value={postal}
          onChange={(e) => setPostal(e.target.value.toUpperCase())}
          placeholder="K1E 0A1"
          autoComplete="postal-code"
          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-lg uppercase tracking-wide focus:border-green-600 focus:outline-none"
        />
      ),
      ok: postalOk,
      onNext: () => set({ postalCode: postal.trim() }),
    },
    {
      title: 'How many people are you feeding?',
      hint: 'We size the recipes and the grocery list to match.',
      body: (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Choice key={n} on={prefs.householdSize === n} onClick={() => set({ householdSize: n })}>
              <span className="block text-center text-lg">{n === 6 ? '6+' : n}</span>
            </Choice>
          ))}
        </div>
      ),
    },
    {
      title: 'Which meals should we plan?',
      hint: 'Pick as many as you like.',
      body: (
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((m) => (
            <Choice key={m.id} on={meals.includes(m.id)} onClick={() => set({ meals: MEALS.map((x) => x.id).filter((id) => (id === m.id ? !meals.includes(id) : meals.includes(id))) })}>
              <span className="mr-1.5">{m.emoji}</span>
              {m.label}
            </Choice>
          ))}
        </div>
      ),
      ok: meals.length > 0,
    },
    {
      title: 'Anything you avoid?',
      hint: 'Skip this if you eat everything.',
      body: (
        <div className="grid grid-cols-2 gap-2">
          {DIET_TAGS.map((t) => (
            <Choice key={t.id} on={prefs.diet.includes(t.id)} onClick={() => set({ diet: toggle(prefs.diet, t.id) })}>
              {t.label}
            </Choice>
          ))}
        </div>
      ),
    },
    {
      title: 'Do you price match?',
      hint: "Pick where you shop and we'll only use the flyers its cashiers accept.",
      body: (
        <div className="grid gap-2">
          {MATCH_STORES.map((s) => (
            <Choice key={s} on={prefs.matchAt === s} onClick={() => set({ matchAt: s })}>
              {s}
              <span className="block text-xs font-normal text-stone-500">{PRICE_MATCH[s].note}</span>
            </Choice>
          ))}
          <Choice on={!prefs.matchAt} onClick={() => set({ matchAt: '' })}>
            No, I shop around
          </Choice>
        </div>
      ),
    },
    !prefs.matchAt && {
      title: 'Where do you shop?',
      hint: "We'll only use these stores' flyers. Leave them all off to use every store nearby.",
      body: merchants.length ? (
        <div className="flex flex-wrap gap-2">
          {merchants.map((m) => (
            <Choice key={m} on={prefs.stores.includes(m)} onClick={() => set({ stores: toggle(prefs.stores, m) })}>
              {m}
            </Choice>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-500">Loading the stores near you… you can also pick them later under ⚙︎ Edit.</p>
      ),
      next: prefs.stores.length ? 'Next' : 'Any store is fine',
    },
    {
      title: "You're all set!",
      body: (
        <p className="text-sm text-stone-700">
          Your week is ready. Want a quick tour? It shows what each part of the screen does, and takes about 30 seconds.
        </p>
      ),
      final: true,
    },
  ].filter(Boolean)

  const s = screens[step]
  const go = () => {
    s.onNext?.()
    setStep(step + 1)
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-stone-50" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1.5">
          {screens.map((_, n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-green-600' : 'bg-stone-200'}`} />
          ))}
        </div>
        {step === 0 && <p className="mt-8 text-sm font-semibold text-green-800">Flyer2Recipes</p>}
        <h1 className={`${step === 0 ? 'mt-1' : 'mt-8'} text-2xl font-bold tracking-tight`}>{s.title}</h1>
        {s.hint && <p className="mt-1 text-sm text-stone-500">{s.hint}</p>}
        <div className="mt-6 flex-1 overflow-y-auto">{s.body}</div>
        <div className="mt-4 flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-600">
              Back
            </button>
          )}
          <span className="flex-1" />
          {s.final ? (
            <>
              <button onClick={() => onDone(false)} className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-600">
                No thanks
              </button>
              <button onClick={() => onDone(true)} className="rounded-2xl bg-green-700 px-5 py-3 text-sm font-semibold text-white">
                Show me around
              </button>
            </>
          ) : (
            <button
              onClick={go}
              disabled={s.ok === false}
              className="rounded-2xl bg-green-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {s.next || 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
