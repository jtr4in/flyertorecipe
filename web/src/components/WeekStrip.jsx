/** Seven-day strip. Tap a day to plan it; each pill shows that night's dinner. */
export default function WeekStrip({ plan, selected, onPick }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Days" data-tour="week">
      {plan.map((d) => {
        const on = d.key === selected
        const dinner = d.meals.dinner
        const icon = dinner?.lines ? dinner.emoji : dinner?.skipped ? '🌙' : '·'
        const cooked = Object.values(d.meals).filter((m) => m.lines)
        const lines = cooked.flatMap((m) => m.lines)
        const allSale = lines.length > 0 && lines.every((l) => l.onSale)
        return (
          <button
            key={d.key}
            role="tab"
            aria-selected={on}
            onClick={() => onPick(d.key)}
            className={`flex w-[3.4rem] shrink-0 flex-col items-center rounded-2xl border py-2 transition ${
              on ? 'border-green-700 bg-green-700 text-white shadow-md' : 'border-stone-200 bg-white'
            }`}
          >
            <span className={`text-[11px] font-medium ${on ? 'text-green-100' : 'text-stone-500'}`}>{d.short}</span>
            <span className="text-sm font-semibold">{d.dayNum}</span>
            <span className="mt-1 text-xl leading-none" aria-hidden>
              {icon}
            </span>
            <span
              className={`mt-1.5 size-1.5 rounded-full ${allSale ? (on ? 'bg-white' : 'bg-green-500') : 'bg-transparent'}`}
              title={allSale ? 'Everything from the flyers' : undefined}
            />
          </button>
        )
      })}
    </div>
  )
}
