// "Build my week": a short quiz (which meals on which days, then the meats, carbs and
// vegetables the household likes) that replans the week from the answers.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { fullSchedule, planScreens } from './PlanSteps'

export default function PlanBuilder({ prefs, onDone, onClose }) {
  const [draft, setDraft] = useState(() => ({ schedule: fullSchedule(prefs), likes: prefs.likes || {} }))
  const [step, setStep] = useState(0)
  const screens = planScreens(draft, setDraft)
  const s = screens[step]
  const last = step === screens.length - 1

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-stone-50" role="dialog" aria-modal="true" aria-label="Build my week">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-1.5">
            {screens.map((_, n) => (
              <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-green-600' : 'bg-stone-200'}`} />
            ))}
          </div>
          <button onClick={onClose} className="text-sm font-medium text-stone-500">
            Cancel
          </button>
        </div>
        <p className="mt-6 text-sm font-semibold text-green-800">Build my week</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{s.title}</h1>
        {s.hint && <p className="mt-1 text-sm text-stone-500">{s.hint}</p>}
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">{s.body}</div>
        <div className="mt-4 flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-600">
              Back
            </button>
          )}
          <span className="flex-1" />
          <button
            onClick={() => (last ? onDone(draft) : setStep(step + 1))}
            disabled={s.ok === false}
            className="rounded-2xl bg-green-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {last ? 'Make my plan' : s.next || 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
