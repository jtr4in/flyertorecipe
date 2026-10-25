// What each list item will roughly cost at the flyer price. Per-pound and per-100 g prices need a
// weight: the amounts in the recipes it's for ("700 g (1 1/2 lb)"), else a typical weight for a
// counted amount ("2 large" chicken breasts), else about a pound. Everything else is one package.

const LB = { lb: 1, lbs: 1, pound: 1, pounds: 1, oz: 1 / 16, kg: 2.2046, g: 0.0022046 }
const NUM = String.raw`(\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?)`
const num = (t) => {
  const [whole, frac] = t.includes('/') && t.includes(' ') ? t.split(/\s+/) : [null, t]
  const one = (x) => (x.includes('/') ? Number(x.split('/')[0]) / Number(x.split('/')[1]) : Number(x.replace(',', '.')))
  return (whole ? Number(whole) : 0) + one(frac)
}

/** Pounds in a measure like "450 g (1 lb)", "1.4 kg", "12 oz", or null when it doesn't say. */
export function poundsIn(measure) {
  const m = new RegExp(`${NUM}\\s*(kg|g|lbs?|pounds?|oz)\\b`, 'i').exec(measure || '')
  return m ? num(m[1]) * LB[m[2].toLowerCase()] : null
}

// Typical weight of one, in pounds, for things recipes count rather than weigh.
const EACH = [
  [/chicken breast/, 0.5], [/chicken thigh/, 0.3], [/drumstick/, 0.25], [/wing/, 0.1], [/pork chop|chop/, 0.4],
  [/sausage/, 0.2], [/fillet|salmon/, 0.4], [/steak/, 0.6], [/sweet potato/, 0.6], [/potato/, 0.5], [/onion/, 0.4],
  [/pepper/, 0.4], [/tomato/, 0.3], [/apple|pear|orange|peach/, 0.4], [/banana|avocado/, 0.4], [/carrot/, 0.15],
  [/zucchini|courgette/, 0.5], [/eggplant|aubergine/, 1.2], [/cucumber/, 0.7], [/lemon|lime/, 0.25],
  [/broccoli/, 1.2], [/cauliflower|cabbage/, 2], [/squash/, 2.5], [/mango/, 0.7],
]

/** Pounds for one recipe amount of `name`: weighed, or counted × a typical weight. */
export function poundsFor(name, measure) {
  const lb = poundsIn(measure)
  if (lb) return lb
  const count = new RegExp(`^\\s*${NUM}\\b`).exec(measure || '')
  const each = EACH.find(([re]) => re.test((name || '').toLowerCase()))
  return count && each ? num(count[1]) * each[1] : null
}

/**
 * { cost, qty, guessed } for a list line at its deal's price. `pounds` is how much the recipes
 * call for (null when unknown). qty reads like "1.5 lb" for weighed prices, or null.
 */
export function estimate(deal, pounds) {
  if (!deal || !(deal.price > 0)) return null
  const unit = deal.unit || ''
  if (!unit) return { cost: deal.price, qty: null, guessed: false }
  const guessed = !pounds
  const lb = pounds || (unit === '/100 g' ? 0.5 : 1)
  const cost = unit === '/lb' ? deal.price * lb : unit === '/kg' ? (deal.price * lb) / LB.kg : unit === '/100 g' ? (deal.price * lb) / (LB.g * 100) : deal.price
  return { cost: Math.round(cost * 100) / 100, qty: `${Math.round(lb * 10) / 10} lb`, guessed }
}
