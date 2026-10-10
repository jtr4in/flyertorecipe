// Flyer-first meal planner. Meal templates ("Sheet-pan {protein} with {veg} & {starch}") are
// filled with whatever is on sale this week, so nearly every ingredient comes from a flyer.
// Pure functions, no Firebase, so it is unit-testable.
import { dislikedItems, scheduled } from './likes'
import { AISLES } from './aisles'
import { PANTRY_AISLES, pantryInfo } from '../data/pantry'
import { CATALOG } from '../data/ingredients'
import { fillText, MEALS, TEMPLATES } from '../data/templates'
import { SAUCES, sauceIngredient } from '../data/sauces'

// ---------- Deals ----------

// Words that mean a deal is not the raw ingredient ("chicken" vs "chicken broth").
const GLOBAL_EXCLUDE = ['seasoning', 'flavour', 'flavor', 'flavoured', 'flavored', 'chips', 'soup', 'beverage', 'drink', 'pet food', 'dog', 'cat food', 'baby',
  // Full flyers carry prepared foods that name a protein: "black bean sauce", "shrimp pastry roll".
  'sauce', 'paste', 'pastry', 'dumpling', 'spring roll', 'marinade', 'dressing', 'cracker']

// Whole words, plurals allowed: "bun" matches "buns" but not "bunch". Letter-aware, so French
// words ending in an accent ("boeuf haché") still match.
const wordRe = (w) => new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es)?(?![\\p{L}\\p{N}])`, 'iu')

export function activeDeals(deals, { stores = [], today = new Date() } = {}) {
  const day = today.toISOString().slice(0, 10)
  const wanted = stores.map((s) => s.toLowerCase())
  return deals.filter((d) => {
    if (d.validTo && d.validTo.slice(0, 10) < day) return false
    if (d.validFrom && d.validFrom.slice(0, 10) > day) return false
    if (wanted.length && !wanted.some((s) => (d.merchant || '').toLowerCase().includes(s))) return false
    return true
  })
}

// Put per-weight prices on one scale so $2.59/100 g doesn't beat $4.99/lb.
export const PER_LB = { '/lb': 1, '/kg': 1 / 2.2046, '/100 g': 4.536 }
const comparable = (d) => d.price * (PER_LB[d.unit] ?? 1)

// Flyer listings often bundle products: "SEEDLESS ORANGES, MINI WHITE OR YELLOW POTATOES".
// A match near the start of a name (or of its English half after "|") is the headline product.
function isHeadline(name, include) {
  return name.split('|').some((part) =>
    include.some((r) => {
      const m = r.exec(part.trim())
      return m && m.index < 25
    }),
  )
}

// A full week is thousands of flyer items and planning asks for the same ingredient many
// times, so each answer is remembered for that deals array (and dropped along with it).
const matchMemo = new WeakMap()

/** Cheapest matching deal, preferring ones where the ingredient is the headline product. */
export function matchDeal(ingredient, deals) {
  if (ingredient.pantry || !ingredient.match?.length) return null
  let memo = matchMemo.get(deals)
  if (!memo) matchMemo.set(deals, (memo = new WeakMap()))
  if (!memo.has(ingredient)) memo.set(ingredient, findDeal(ingredient, deals))
  return memo.get(ingredient)
}

/** Every deal for the ingredient, best first (headline product, then cheapest). */
export function matchAll(ingredient, deals) {
  if (ingredient.pantry || !ingredient.match?.length) return []
  const include = ingredient.match.map(wordRe)
  const global = GLOBAL_EXCLUDE.filter((w) => !ingredient.allow?.includes(w))
  const exclude = [...global, ...(ingredient.exclude || [])].map(wordRe)
  return deals
    .filter((d) => include.some((r) => r.test(d.name)) && !exclude.some((r) => r.test(d.name)))
    .map((d) => ({ d, rank: [isHeadline(d.name, include) ? 0 : 1, comparable(d)] }))
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1])
    .map((x) => x.d)
}

function findDeal(ingredient, deals) {
  const include = ingredient.match.map(wordRe)
  const global = GLOBAL_EXCLUDE.filter((w) => !ingredient.allow?.includes(w))
  const exclude = [...global, ...(ingredient.exclude || [])].map(wordRe)
  let best = null
  let bestRank = null
  for (const d of deals) {
    if (!include.some((r) => r.test(d.name))) continue
    if (exclude.some((r) => r.test(d.name))) continue
    const rank = [isHeadline(d.name, include) ? 0 : 1, comparable(d)]
    if (!best || rank[0] < bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1])) {
      best = d
      bestRank = rank
    }
  }
  return best
}

// ---------- Costs ----------

// Typical regular price of one package (or one lb) when nothing is on sale, by aisle.
const FALLBACK_PRICE = {
  Produce: 3, 'Meat & Seafood': 7.5, 'Dairy & Eggs': 5, Bakery: 3.75, Frozen: 4.5,
  Pantry: 3.5, Snacks: 4, 'Plant Protein': 3.5, Other: 4,
}
const LB_PER_ITEM = 0.4 // when a per-lb deal meets a recipe that counts items (apples, peppers)

/**
 * Price of one flyer package (or one lb for per-weight deals), and how much of the
 * ingredient's unit that covers. Flyers rarely say package size, so `pkg` in the catalog
 * is our best guess; per-item deals under $2 (peppers at $0.99 ea) are treated as singles.
 */
/**
 * Most flyers don't print a regular price, so the list can't know what a deal saves. Where it
 * doesn't say, assume the typical flyer discount (~23% off), i.e. the sale price is 77% of regular.
 */
export const ASSUMED_OFF = 0.23
export const hasSavings = (deal) => deal?.savings > 0
export const assumedSavings = (cost) => (cost * ASSUMED_OFF) / (1 - ASSUMED_OFF)

function unitEconomics(ing, deal) {
  if (!deal) {
    const price = FALLBACK_PRICE[ing.aisle] ?? 4
    return { price, savings: 0, covers: ing.unit === 'lb' ? 1 : ing.pkg || 1 }
  }
  const perLb = PER_LB[deal.unit]
  if (perLb) {
    const lbPrice = deal.price * perLb
    const lbSavings = (deal.savings || 0) * perLb
    if (ing.unit === 'lb') return { price: lbPrice, savings: lbSavings, covers: 1 }
    if (ing.lb) return { price: lbPrice * ing.lb, savings: lbSavings * ing.lb, covers: 1 }
    if (ing.unit === 'each') return { price: lbPrice * LB_PER_ITEM, savings: lbSavings * LB_PER_ITEM, covers: 1 }
    return { price: lbPrice, savings: lbSavings, covers: ing.pkg || 1 }
  }
  if (ing.unit === 'each' && deal.price < 2) return { price: deal.price, savings: deal.savings || 0, covers: 1 }
  return { price: deal.price, savings: deal.savings || 0, covers: ing.pkg || 1 }
}

/** Cost of the portion a meal uses (a quarter bag of carrots costs a quarter of the bag). */
export function portionCost(ing, qty, deal) {
  const u = unitEconomics(ing, deal)
  const share = qty / u.covers
  return { cost: u.price * share, savings: u.savings * share }
}

/** What you actually buy: whole packages (or weights to the 1/4 lb) and what they cost. */
export function buyCost(ing, qty, deal) {
  const u = unitEconomics(ing, deal)
  const perWeight = deal && PER_LB[deal.unit] && ing.unit === 'lb'
  const units = perWeight ? Math.max(0.25, Math.ceil((qty - 0.01) * 4) / 4) : Math.max(1, Math.ceil(qty / u.covers - 0.05))
  return { units, perWeight: !!perWeight, single: ing.unit === 'each' && u.covers === 1, cost: u.price * units, savings: u.savings * units }
}

// ---------- Filters & search box ----------

const PROTEIN_HAS = ['meat', 'fish', 'egg']
const isHighProtein = (meal) =>
  meal.lines.some((l) => l.main && (l.ing.has.some((h) => PROTEIN_HAS.includes(h)) || ['firm tofu', 'lentils', 'chickpeas', 'black beans'].includes(l.ing.item)))

export const FILTERS = [
  { id: 'quick', label: 'Quick (≤25 min)', emoji: '⚡', test: (m) => m.template.minutes <= 25 },
  { id: 'high-protein', label: 'High protein', emoji: '💪', test: isHighProtein },
  { id: 'kid-approved', label: 'Kid-approved', emoji: '🧒', test: (m) => m.template.tags.includes('kid-approved') },
  { id: 'big-batch', label: 'Big batch', emoji: '🍲', test: (m) => m.template.tags.includes('big-batch') },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥦', diet: 'vegetarian' },
  // A nudge, not a rule: fun dishes win where they're on sale, most of all for snacks.
  { id: 'treats', label: 'Treats', emoji: '🍪', boost: (m) => (m.template.vibes.includes('treat') ? (m.template.meal === 'snack' ? 60 : 25) : 0) },
]

/**
 * Turn "quick high protein meals under $150" into filters + a weekly budget.
 * Keyword rules only; an LLM could replace this later without changing callers.
 */
export function parsePlanQuery(q) {
  const text = (q || '').toLowerCase()
  const filters = new Set()
  if (/\b(quick|fast|easy|\d{1,2}\s*-?\s*min)/.test(text)) filters.add('quick')
  if (/protein|gym|muscle/.test(text)) filters.add('high-protein')
  if (/kid|family|picky/.test(text)) filters.add('kid-approved')
  if (/batch|meal ?prep|leftover|freez/.test(text)) filters.add('big-batch')
  if (/vegetarian|veggie|meatless/.test(text)) filters.add('vegetarian')
  if (/treat|fun|dessert|cookie|sweet tooth|junk/.test(text)) filters.add('treats')
  const m = text.match(/(?:under|below|less than|max|budget)\s*\$?\s*(\d{2,4})|\$\s*(\d{2,4})/)
  return { filters: [...filters], budget: m ? Number(m[1] || m[2]) : null }
}

// ---------- Diet ----------

const DIET_BLOCKS = {
  vegetarian: ['meat', 'fish'],
  vegan: ['meat', 'fish', 'dairy', 'egg'],
  'dairy-free': ['dairy'],
  'gluten-free': ['gluten'],
}
export const allowedByDiet = (ing, diet) => {
  const blocked = diet.flatMap((d) => DIET_BLOCKS[d] || [])
  return !ing.has.some((h) => blocked.includes(h))
}

// ---------- Filling templates ----------

/** Every catalog item a slot may use, with this week's best deal. */
export function slotCandidates(slot, deals, diet, priced = new Map()) {
  const out = []
  for (const group of slot.from) {
    for (const base of CATALOG[group] || []) {
      if (slot.only && !slot.only.includes(base.item)) continue
      if (slot.exclude?.includes(base.item)) continue
      if (!allowedByDiet(base, diet)) continue
      const key = `${group}:${base.item}`
      if (!priced.has(key)) priced.set(key, matchDeal(base, deals))
      out.push({ ing: { ...base, qty: base.qty * (slot.qty || 1) }, deal: priced.get(key), group })
    }
  }
  return out
}

/**
 * Fill a template for `servings` people. Each slot takes the best on-sale candidate,
 * preferring items already on this week's list (fewer half-used packages) and avoiding
 * a third dinner built on the same protein. Returns null if a required slot can't be filled.
 */
export function fillTemplate(template, ctx) {
  const { deals, diet, servings, fills = {}, usage = {}, priced, avoid = [], want } = ctx
  const used = new Set()
  const lines = []
  for (const slot of template.slots) {
    let cands = slotCandidates(slot, deals, diet, priced).filter((c) => !used.has(c.ing.item))
    // Items swapped off the grocery list stay off unless nothing else fits (or it's asked for).
    const kept = cands.filter((c) => !avoid.includes(c.ing.item) || c.ing.item === fills[slot.key])
    if (kept.length) cands = kept
    if (!cands.length) {
      if (slot.optional) continue
      return null
    }
    const forced = fills[slot.key] && cands.find((c) => c.ing.item === fills[slot.key])
    let pick = forced
    if (!pick) {
      const rank = (c) => {
        const p = portionCost(c.ing, c.ing.qty, c.deal)
        let s = c.deal ? 100 : 0
        s += Math.min(p.savings * 4, 8)
        s -= p.cost * 2
        const n = usage[c.ing.item] || 0
        if (slot.prefer === c.ing.item) s += 6 // the recipe's usual pick, when it's on sale too
        // On the household's "we need" list: they're buying it anyway, so cook with it.
        if (want?.has(c.ing.item) && !n) s += 110
        if (n) s += 3 // reuse what's already bought...
        s -= Math.max(0, n - 3) * 4 // ...but not pears at every meal
        if (slot.main && template.meal === 'dinner' && (usage[`main:${c.ing.item}`] || 0) >= 2) s -= 60
        return s
      }
      pick = cands.reduce((a, b) => (rank(b) > rank(a) ? b : a))
    }
    // Optional extras only when they're on sale.
    if (slot.optional && !pick.deal && !forced) continue
    used.add(pick.ing.item)
    const qty = pick.ing.qty * servings
    lines.push({
      slot: slot.key,
      main: !!slot.main,
      ing: pick.ing,
      group: pick.group,
      deal: pick.deal,
      qty,
      onSale: !!pick.deal,
      ...portionCost(pick.ing, qty, pick.deal),
      alternatives: slot.from,
      slotDef: slot,
    })
  }
  const label = Object.fromEntries(lines.map((l) => [l.slot, l.ing.as || l.ing.item]))
  const cost = lines.reduce((a, l) => a + l.cost, 0)
  const savings = lines.reduce((a, l) => a + l.savings, 0)
  const onSale = lines.filter((l) => l.onSale).length
  const endsSoon = lines.map((l) => l.deal?.validTo).filter(Boolean).sort()[0] || null
  return {
    template,
    name: template.name(label),
    steps: template.steps.map((st) => fillText(st, label)),
    emoji: template.emoji,
    minutes: template.minutes,
    lines,
    pantry: template.pantry,
    cost: round2(cost),
    savings: round2(savings),
    onSale,
    regular: lines.length - onSale,
    servings,
    endsSoon,
  }
}

const round2 = (n) => Math.round(n * 100) / 100

/**
 * The meal made with a store-bought sauce instead of from scratch: the jar goes on the list (on
 * sale if a flyer has one), and the pantry items and slots that only made the sauce come off.
 */
export function withJar(meal, deals) {
  const s = SAUCES[meal.template.id]
  if (!s) return meal
  const ing = sauceIngredient(meal.template.id)
  const deal = matchDeal(ing, deals)
  const qty = ing.qty * meal.servings
  const jar = { slot: 'jar', ing, deal, qty, onSale: !!deal, ...portionCost(ing, qty, deal), alternatives: [], slotDef: { key: 'jar' } }
  const lines = [...meal.lines.filter((l) => !s.slots?.includes(l.slot)), jar]
  const skip = new Set(s.replaces.map((p) => p.toLowerCase()))
  const onSale = lines.filter((l) => l.onSale).length
  return {
    ...meal,
    lines,
    pantry: meal.pantry.filter((p) => !skip.has(p.toLowerCase())),
    steps: [`Shortcut: use a jar of store-bought ${s.sauce} wherever the recipe makes its sauce.`, ...meal.steps],
    cost: round2(lines.reduce((a, l) => a + l.cost, 0)),
    savings: round2(lines.reduce((a, l) => a + l.savings, 0)),
    onSale,
    regular: lines.length - onSale,
    jar: s.sauce,
  }
}

// Same template again this week: dinners should almost never repeat, breakfasts often do.
const REPEAT_PENALTY = { dinner: 25, lunch: 10, breakfast: 4, snack: 5 }

function scoreMeal(meal, ctx) {
  const share = meal.lines.length ? meal.onSale / meal.lines.length : 0
  let s = share * 100 // stay on sale above all
  s += Math.min(meal.savings, 10)
  s -= (ctx.templateUse[meal.template.id] || 0) * REPEAT_PENALTY[meal.template.meal]
  if (ctx.yesterday?.[meal.template.meal] === meal.template.id) s -= 15
  if (ctx.budgetPerServing) s -= Math.max(0, meal.cost / meal.servings - ctx.budgetPerServing) * 8
  // Dishes that use up something on the "we need" list that no meal uses yet.
  if (ctx.want) s += meal.lines.filter((l) => ctx.want.has(l.ing.item) && !ctx.usage[l.ing.item]).length * 30
  return s
}

// ---------- Week ----------

const dayKey = (d) => d.toISOString().slice(0, 10)

/** The next 7 days starting today. */
export function weekDays(start = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12)
    return { key: dayKey(d), date: d, short: i === 0 ? 'Today' : d.toLocaleDateString('en-CA', { weekday: 'short' }), dayNum: d.getDate() }
  })
}

// Rough share of a day's food budget per meal, to steer pricier meals to dinner.
const BUDGET_SHARE = { breakfast: 0.15, lunch: 0.25, dinner: 0.45, snack: 0.15 }

/**
 * Plan every enabled meal for every day.
 * overrides[`${day}|${meal}`] = { skip, exclude: [templateIds], fills: {slotKey: item}, template }
 * avoid: items swapped off the grocery list, kept out of every meal where possible.
 * Lunch can be last night's dinner (prefs.lunchLeftovers): that dinner is then cooked double.
 */
export function planWeek(deals, prefs, { days, filters = [], budget = null, overrides = {}, avoid = [], want = null } = {}) {
  const diet = [...new Set([...(prefs.diet || []), ...FILTERS.filter((f) => f.diet && filters.includes(f.id)).map((f) => f.diet)])]
  const tests = FILTERS.filter((f) => f.test && filters.includes(f.id)).map((f) => f.test)
  const boosts = FILTERS.filter((f) => f.boost && filters.includes(f.id)).map((f) => f.boost)
  const enabled = MEALS.filter((m) => (prefs.meals || ['breakfast', 'lunch', 'dinner', 'snack']).includes(m.id)).map((m) => m.id)
  const servings = prefs.householdSize || 2
  const priced = new Map()
  const ctx = { templateUse: {}, usage: {}, yesterday: null, want: want?.size ? want : null }
  const dislike = dislikedItems(prefs.likes)
  const keepOff = dislike.size ? [...avoid, ...dislike] : avoid
  const perDayBudget = budget ? budget / days.length : null

  const plan = []
  let prevDinner = null
  for (const day of days) {
    const today = {}
    const entry = { ...day, meals: {} }
    // Dinner first, so tomorrow's leftover lunch knows what it is.
    // Plus any meal added to just this day (a recipe picked for it).
    const dayMeals = MEALS.map((m) => m.id).filter((m) => enabled.includes(m) || overrides[`${day.key}|${m}`]?.on)
    const order = dayMeals.sort((a, b) => (a === 'dinner' ? -1 : b === 'dinner' ? 1 : 0))
    for (const meal of order) {
      const key = `${day.key}|${meal}`
      const o = overrides[key] || {}
      if (o.skip) {
        entry.meals[meal] = { key, meal, skipped: true }
        continue
      }
      if (!o.on && !scheduled(prefs, day, meal)) {
        entry.meals[meal] = { key, meal, skipped: true, off: true }
        continue
      }
      if (meal === 'lunch' && prefs.lunchLeftovers && prevDinner && !o.cook && !o.template) {
        prevDinner.leftoversFor = day.short
        entry.meals[meal] = { key, meal, leftovers: prevDinner }
        continue
      }
      ctx.budgetPerServing = perDayBudget ? (perDayBudget * BUDGET_SHARE[meal]) / servings : null
      let best = null
      let bestScore = -Infinity
      for (const template of TEMPLATES) {
        if (template.meal !== meal) continue
        if (o.exclude?.includes(template.id)) continue
        if (o.template && o.template !== template.id) continue
        const filled = fillTemplate(template, { deals, diet, servings, fills: o.template === template.id ? o.fills : undefined, usage: ctx.usage, priced, avoid: keepOff, want: ctx.want })
        if (!filled) continue
        if (meal !== 'snack' && !tests.every((t) => t(filled))) continue
        let s = scoreMeal(filled, ctx) + boosts.reduce((sum, b) => sum + b(filled), 0)
        // A recipe that could only be made with something they don't eat, only if nothing else fits.
        if (dislike.size) s -= filled.lines.filter((l) => dislike.has(l.ing.item)).length * 200
        if (s > bestScore) {
          best = filled
          bestScore = s
        }
      }
      if (!best) {
        entry.meals[meal] = { key, meal, empty: true }
        continue
      }
      best.key = key
      best.meal = meal
      best.day = day.key
      entry.meals[meal] = best
      ctx.templateUse[best.template.id] = (ctx.templateUse[best.template.id] || 0) + 1
      today[meal] = best.template.id
      for (const l of best.lines) {
        ctx.usage[l.ing.item] = (ctx.usage[l.ing.item] || 0) + 1
        if (l.main && meal === 'dinner') ctx.usage[`main:${l.ing.item}`] = (ctx.usage[`main:${l.ing.item}`] || 0) + 1
      }
    }
    prevDinner = entry.meals.dinner && !entry.meals.dinner.skipped && !entry.meals.dinner.empty ? entry.meals.dinner : null
    ctx.yesterday = today
    plan.push(entry)
  }
  // Dinners that feed tomorrow's lunch are cooked double.
  for (const d of plan) {
    const dn = d.meals.dinner
    if (dn?.leftoversFor) dn.batches = 2
  }
  return plan
}

/** All cooked meals in the plan, flattened. */
export const cookedMeals = (plan) =>
  plan.flatMap((d) => Object.values(d.meals)).filter((m) => m && m.lines)

/** Swap options for one slot of a meal: every allowed item, on-sale first, cheapest first. */
export function swapOptions(meal, line, deals, prefs) {
  const cands = slotCandidates(line.slotDef, deals, prefs.diet || [])
  return cands
    .map((c) => ({ ...c, qty: c.ing.qty * meal.servings, ...portionCost(c.ing, c.ing.qty * meal.servings, c.deal) }))
    .sort((a, b) => (b.deal ? 1 : 0) - (a.deal ? 1 : 0) || a.cost - b.cost)
}

/**
 * Swap options for a grocery item across every meal that uses it. Each option lists the
 * meals it fits (`fits`) and its cost across them; items that fit every meal come first.
 */
export function listSwapOptions(uses, deals, prefs) {
  const per = uses.map(({ meal, line }) => swapOptions(meal, line, deals, prefs))
  const byItem = new Map()
  per.forEach((opts, i) => {
    for (const o of opts) {
      const row = byItem.get(o.ing.item) || { ...o, cost: 0, fits: [] }
      row.cost += o.cost * (uses[i].meal.batches || 1)
      row.fits.push(uses[i])
      byItem.set(o.ing.item, row)
    }
  })
  return [...byItem.values()].sort((a, b) => b.fits.length - a.fits.length || (b.deal ? 1 : 0) - (a.deal ? 1 : 0) || a.cost - b.cost)
}

// ---------- Change meal ----------

const PROTEIN_SNACKS = ['eggs', 'yogurt', 'nuts', 'cheddar', 'peanut butter', 'hummus', 'chickpeas']

export const NUDGES = {
  healthy: { label: 'Healthier', emoji: '🥗', test: (m) => m.template.vibes.includes('healthy') },
  light: { label: 'Lighter', emoji: '🌿', test: (m) => m.template.vibes.includes('light') },
  comfort: { label: 'Comfort food', emoji: '🍲', test: (m) => m.template.vibes.includes('comfort') },
  sweet: { label: 'Sweet', emoji: '🍓', test: (m) => m.template.vibes.includes('sweet') },
  savoury: { label: 'Savoury', emoji: '🧂', test: (m) => m.template.vibes.includes('savoury') },
  treat: { label: 'Fun / treat', emoji: '🍪', test: (m) => m.template.vibes.includes('treat') },
  protein: {
    label: 'More protein', emoji: '💪',
    test: (m) => isHighProtein(m) || m.lines.some((l) => PROTEIN_SNACKS.includes(l.ing.item)),
  },
  veggie: { label: 'Meatless', emoji: '🥦', test: (m) => !m.lines.some((l) => l.ing.has.some((h) => h === 'meat' || h === 'fish')) },
  quick: { label: 'Quicker', emoji: '⚡', test: (m, cur) => m.minutes < cur.minutes || m.minutes <= 10 },
  cheap: { label: 'Cheaper', emoji: '💸', test: (m, cur) => m.cost < cur.cost },
}
export const MEAL_NUDGES = {
  breakfast: ['healthy', 'protein', 'treat', 'sweet', 'savoury', 'quick'],
  lunch: ['light', 'protein', 'treat', 'veggie', 'quick', 'cheap'],
  dinner: ['light', 'comfort', 'treat', 'veggie', 'quick', 'cheap'],
  snack: ['healthy', 'treat', 'protein', 'sweet', 'savoury', 'cheap'],
}

/**
 * Other dishes for one meal slot, best first: every template for that meal, plus variants
 * built around each on-sale main ingredient, so there's always another idea to rotate to.
 * Each idea carries `fills` to lock it in as an override.
 */
export function suggestMeals(current, deals, prefs, { nudge = null, plan = [] } = {}) {
  const diet = prefs.diet || []
  const priced = new Map()
  const weekUse = {}
  const dislike = dislikedItems(prefs.likes)
  const keepOff = [...dislike]
  for (const m of cookedMeals(plan)) weekUse[m.template.id] = (weekUse[m.template.id] || 0) + 1
  const ideas = new Map()
  const add = (m) => {
    if (!m || m.name === current.name || ideas.has(m.name)) return
    m.fills = Object.fromEntries(m.lines.map((l) => [l.slot, l.ing.item]))
    ideas.set(m.name, m)
  }
  for (const template of TEMPLATES) {
    if (template.meal !== current.meal) continue
    const ctx = { deals, diet, servings: current.servings, priced, avoid: keepOff }
    const base = fillTemplate(template, ctx)
    add(base)
    if (!base) continue
    // Variants: the same dish around a different on-sale lead ingredient.
    const lead = template.slots.find((sl) => sl.main) || template.slots[0]
    const others = slotCandidates(lead, deals, diet, priced).filter((c) => c.deal && c.ing.item !== base.fills?.[lead.key] && !dislike.has(c.ing.item))
    for (const c of others.slice(0, 3)) add(fillTemplate(template, { ...ctx, fills: { [lead.key]: c.ing.item } }))
  }
  const test = nudge && NUDGES[nudge]?.test
  return [...ideas.values()]
    .filter((m) => !test || test(m, current))
    .map((m) => {
      const share = m.lines.length ? m.onSale / m.lines.length : 0
      let score = share * 100 + Math.min(m.savings, 8) - (weekUse[m.template.id] || 0) * 6
      score -= m.lines.filter((l) => dislike.has(l.ing.item)).length * 200
      if (m.template.id === current.template.id) score -= 4
      if (nudge === 'cheap') score -= m.cost * 3
      return { m, score }
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.m)
    // Rotate through dishes: each template's best version before any second version.
    .map((m, i, all) => ({ m, round: all.slice(0, i).filter((o) => o.template.id === m.template.id).length, i }))
    .sort((a, b) => a.round - b.round || a.i - b.i)
    .map((x) => x.m)
}

// ---------- Shopping list ----------

/** Store that covers the most list items (ties: bigger savings). */
function bestSingleStore(rows, deals) {
  const stores = [...new Set(deals.map((d) => d.merchant).filter(Boolean))]
  let best = null
  for (const store of stores) {
    const storeDeals = deals.filter((d) => d.merchant === store)
    let covered = 0
    let savings = 0
    for (const row of rows) {
      const d = matchDeal(row.ing, storeDeals)
      if (d) {
        covered += 1
        savings += buyCost(row.ing, row.qty, d).savings
      }
    }
    if (!best || covered > best.covered || (covered === best.covered && savings > best.savings)) best = { store, covered, savings }
  }
  return best
}

/**
 * Everything the week's meals need, as whole packages, grouped by aisle (store-walk order).
 *  mode "match":  shop at one store and price-match: every item at the cheapest flyer price
 *                 from any store, with the flyer to show the cashier.
 *  mode "single": only the chosen store's own flyer deals; the rest at regular price there.
 * The store is prefs.homeStore, or the one with the most of the list on sale.
 */
/**
 * Pantry items the week calls for: staples (`pantry`, names only) and the less common ones to
 * check for before shopping (`pantryCheck`, grouped by aisle, with the dishes that need them).
 */
function pantryList(rows) {
  const byName = (a, b) => a.item.localeCompare(b.item)
  const check = rows.filter((r) => !pantryInfo(r.item).staple)
  return {
    pantry: rows.filter((r) => pantryInfo(r.item).staple).sort(byName).map((r) => r.item),
    pantryCheck: PANTRY_AISLES.map((title) => ({
      title,
      items: check.filter((r) => pantryInfo(r.item).aisle === title).sort(byName),
    })).filter((g) => g.items.length),
  }
}

export function buildShoppingList(plan, deals, prefs, { mode = 'match', picks = {} } = {}) {
  const totals = new Map()
  const pantry = new Map() // item -> dish names
  for (const meal of cookedMeals(plan)) {
    const mult = meal.batches || 1
    for (const p of meal.pantry) {
      const k = p.toLowerCase()
      const row = pantry.get(k) || { item: p, meals: [] }
      if (!row.meals.includes(meal.name)) row.meals.push(meal.name)
      pantry.set(k, row)
    }
    for (const l of meal.lines) {
      const key = l.ing.item
      const row = totals.get(key) || { ing: l.ing, qty: 0, meals: [], uses: [] }
      row.qty += l.qty * mult
      if (!row.meals.includes(meal.name)) row.meals.push(meal.name)
      row.uses.push({ meal, line: l })
      totals.set(key, row)
    }
  }
  const rows = [...totals.values()]
  const suggested = bestSingleStore(rows, deals)
  // A home store picked earlier may be outside the stores now being planned from; ignore it then.
  const home = prefs.homeStore && deals.some((d) => d.merchant === prefs.homeStore) ? prefs.homeStore : null
  const store = home || suggested?.store || null
  const pool = mode === 'single' && store ? deals.filter((d) => d.merchant === store) : deals

  let totalCost = 0
  let totalSavings = 0
  let onSale = 0
  const byAisle = {}
  const flyers = []
  for (const row of rows) {
    // A deal the household picked from "Other options" wins while it's still in the flyers.
    const deal = (picks[row.ing.item] && pool.find((d) => d.dealId === picks[row.ing.item])) || matchDeal(row.ing, pool)
    const b = buyCost(row.ing, row.qty, deal)
    const estimated = !!deal && !hasSavings(deal)
    if (estimated) b.savings = assumedSavings(b.cost)
    totalCost += b.cost
    totalSavings += b.savings
    if (deal) {
      onSale += 1
      flyers.push({ item: row.ing.item, deal })
    }
    const item = {
      key: row.ing.item,
      item: row.ing.item,
      ing: row.ing,
      unit: row.ing.unit,
      aisle: row.ing.aisle,
      buy: b.perWeight ? `${b.units} lb` : b.single ? `${b.units}` : `${b.units} ${b.units === 1 ? 'pkg' : 'pkgs'}`,
      deal,
      meals: row.meals,
      uses: row.uses,
      cost: round2(b.cost),
      savings: round2(b.savings),
      estimated,
    }
    ;(byAisle[item.aisle] ||= []).push(item)
  }
  const groups = AISLES.filter((a) => byAisle[a]).map((a) => ({
    title: a,
    items: byAisle[a].sort((x, y) => x.item.localeCompare(y.item)),
  }))
  return {
    mode,
    store,
    suggestedStore: suggested,
    groups,
    flyers: flyers.sort((a, b) => a.deal.merchant.localeCompare(b.deal.merchant)),
    matchStores: [...new Set(flyers.map((f) => f.deal.merchant))],
    ...pantryList([...pantry.values()]),
    totalCost: round2(totalCost),
    totalSavings: round2(totalSavings),
    onSale,
    itemCount: rows.length,
  }
}
