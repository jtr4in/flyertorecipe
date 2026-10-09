export default function MealPlan({ plan, prefs }) {
  if (!plan.length)
    return <p className="text-stone-500">No recipes fit these diet settings yet. Try removing a tag.</p>

  return (
    <div className="space-y-3">
      {plan.length < prefs.mealsPerWeek && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Only {plan.length} recipes match your diet settings, so the plan is shorter than {prefs.mealsPerWeek} dinners.
        </p>
      )}
      {plan.map(({ recipe, matches, savings }, idx) => {
        const onSale = Object.entries(matches)
        return (
          <article key={recipe.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-stone-400 uppercase">Dinner {idx + 1}</p>
            <h2 className="mt-0.5 font-semibold">{recipe.name}</h2>
            <p className="text-xs text-stone-500">
              {recipe.minutes} min · serves {prefs.householdSize}
              {savings > 0 && <> · saves about ${savings.toFixed(2)}</>}
            </p>
            {onSale.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {onSale.map(([item, d]) => (
                  <li key={item} className="flex justify-between gap-2">
                    <span className="truncate">
                      <span className="text-green-700">●</span> {item}{' '}
                      <span className="text-stone-400">at {d.merchant}</span>
                    </span>
                    <span className="shrink-0 font-medium">{d.priceLabel || d.priceText}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        )
      })}
    </div>
  )
}
