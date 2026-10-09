// The "Build my week" quiz: which meals on which days, and the meats, carbs and vegetables the
// household likes. Within a kind of food they answered, the ones they didn't pick are kept off the
// plan unless a recipe has nothing else (the same way swapped-off items are).
import { CATALOG } from '../data/ingredients'

const items = (...groups) => groups.flatMap((g) => CATALOG[g].map((i) => i.item))

const VEG_EMOJI = {
  broccoli: '🥦', 'bell peppers': '🫑', 'green beans': '🫛', zucchini: '🥒', cauliflower: '🥦', mushrooms: '🍄',
  carrots: '🥕', asparagus: '🌱', 'brussels sprouts': '🥬', squash: '🎃', 'frozen mixed vegetables': '🧊',
  lettuce: '🥬', spinach: '🥬', 'salad greens': '🥗', kale: '🥬', cucumber: '🥒', tomatoes: '🍅', celery: '🌿',
}

export const LIKE_GROUPS = [
  {
    id: 'protein',
    title: 'Which meats and proteins do you like?',
    hint: "We'll build dinners and lunches around these.",
    options: [
      { id: 'chicken', label: 'Chicken', emoji: '🍗', items: ['chicken breasts', 'chicken thighs', 'whole chicken', 'ground chicken', 'rotisserie chicken'] },
      { id: 'beef', label: 'Beef', emoji: '🥩', items: ['ground beef'] },
      { id: 'pork', label: 'Pork', emoji: '🐖', items: ['pork chops', 'pork tenderloin', 'ground pork'] },
      { id: 'sausage', label: 'Sausage', emoji: '🌭', items: ['sausages'] },
      { id: 'turkey', label: 'Turkey', emoji: '🦃', items: ['ground turkey'] },
      { id: 'deli', label: 'Deli meat', emoji: '🥪', items: ['deli turkey or ham'] },
      { id: 'salmon', label: 'Salmon', emoji: '🐟', items: ['salmon'] },
      { id: 'whitefish', label: 'White fish', emoji: '🐠', items: ['white fish'] },
      { id: 'tuna', label: 'Canned tuna', emoji: '🥫', items: ['canned tuna'] },
      { id: 'shrimp', label: 'Shrimp', emoji: '🍤', items: ['shrimp'] },
      { id: 'tofu', label: 'Tofu', emoji: '🧊', items: ['firm tofu'] },
      { id: 'beans', label: 'Beans & lentils', emoji: '🫘', items: ['chickpeas', 'black beans', 'lentils'] },
    ],
  },
  {
    id: 'carb',
    title: 'And carbs?',
    hint: 'Rice, pasta, potatoes…',
    options: [
      { id: 'rice', label: 'Rice', emoji: '🍚', items: ['rice'] },
      { id: 'pasta', label: 'Pasta & noodles', emoji: '🍝', items: ['pasta', 'egg noodles'] },
      { id: 'potatoes', label: 'Potatoes', emoji: '🥔', items: ['potatoes'] },
      { id: 'sweetpotatoes', label: 'Sweet potatoes', emoji: '🍠', items: ['sweet potatoes'] },
      { id: 'quinoa', label: 'Quinoa', emoji: '🌾', items: ['quinoa'] },
      { id: 'wraps', label: 'Wraps, pitas & naan', emoji: '🌯', items: ['tortillas', 'pitas', 'naan'] },
      { id: 'bread', label: 'Bread & bagels', emoji: '🍞', items: ['bread', 'bagels', 'English muffins', 'buns'] },
    ],
  },
  {
    id: 'veg',
    title: 'Which vegetables?',
    hint: 'Pick the ones your household will actually eat.',
    options: [...new Set(items('cookingVeg', 'greens', 'saladVeg'))].map((item) => ({
      id: item,
      label: item === 'frozen mixed vegetables' ? 'Frozen mixed veg' : item[0].toUpperCase() + item.slice(1),
      emoji: VEG_EMOJI[item] || '🥬',
      items: [item],
    })),
  },
]

/** Items to keep off the plan: in a kind of food they answered, everything they didn't pick. */
export function dislikedItems(likes) {
  const out = new Set()
  for (const g of LIKE_GROUPS) {
    const picked = likes?.[g.id] || []
    if (!picked.length) continue
    const liked = new Set(g.options.filter((o) => picked.includes(o.id)).flatMap((o) => o.items))
    for (const o of g.options) for (const i of o.items) if (!liked.has(i)) out.add(i)
  }
  return out
}

/** Weekday (0 = Sunday) a plan day falls on. */
export const weekday = (day) => day.date.getDay()

/** Is this meal on the household's schedule for that day? No schedule means every planned meal, every day. */
export function scheduled(prefs, day, meal) {
  const s = prefs.schedule
  if (!s) return true
  return (s[weekday(day)] || []).includes(meal)
}
