/** Seven-day strip: what's for dinner each night at a glance. Tap a day to jump to it. */
export default function WeekStrip({ days, onPick }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {days.map((d) => {
        const icon =
          d.type === 'cook' ? d.meal.recipe.emoji : d.type === 'leftovers' ? '🥡' : d.type === 'off' ? '🌙' : '＋'
        const sub = d.type === 'cook' ? 'Cook' : d.type === 'leftovers' ? 'Leftovers' : d.type === 'off' ? 'Off' : 'Open'
        return (
          <button
            key={d.key}
            onClick={() => onPick(d.key)}
            className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 ${
              d.type === 'cook'
                ? 'border-green-200 bg-green-50'
                : d.type === 'leftovers'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-stone-200 bg-white'
            }`}
          >
            <span className="text-[11px] font-medium text-stone-500">{d.short}</span>
            <span className="text-sm font-semibold">{d.dayNum}</span>
            <span className="mt-1 text-xl leading-none" aria-hidden>
              {icon}
            </span>
            <span className="mt-1 text-[10px] text-stone-500">{sub}</span>
          </button>
        )
      })}
    </div>
  )
}
