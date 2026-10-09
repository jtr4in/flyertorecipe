// Recipes as flexible templates. Each is a normal recipe whose ingredients are slots: a slot
// names the catalog groups it may draw from (and optionally the recipe's usual pick, `prefer`),
// and the planner fills it with whatever in those groups is on sale this week. So
// "Sheet-pan {protein} with {veg} & {starch}" becomes "Sheet-pan chicken thighs with broccoli
// & potatoes" in a week where those are in the flyers.
//
// The recipes live in recipes.json (bundled) and in Firestore `recipes/` (seeded from the same
// file by .github/workflows/recipes.yml). The app swaps in the Firestore set via setRecipes.
//
// recipe: { id, meal, name, emoji, minutes, slots, pantry, tags, vibes, steps }
//   name:  "{slot}" is the filled item; "[ with {veg2}]" shows only when every slot inside is filled.
//   slot:  { key, from: [catalog groups], only?, exclude?, prefer?, qty?: multiplier, main?, optional? }
//   steps: short method lines, which may use the same {slot} placeholders.
//   tags:  quick | kid-approved | big-batch    vibes: healthy | light | comfort | sweet | savoury
import RECIPES from './recipes.json'

export function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

/** Fill "{slot}" placeholders; "[...]" sections drop out when any slot in them is empty. */
export function fillText(text, fills) {
  const sub = (s) => s.replace(/\{(\w+)\}/g, (_, k) => fills[k] ?? '')
  const out = text.replace(/\[([^\]]*)\]/g, (_, part) => {
    const keys = [...part.matchAll(/\{(\w+)\}/g)].map((x) => x[1])
    return keys.every((k) => fills[k]) ? sub(part) : ''
  })
  return sub(out).replace(/\s+/g, ' ').trim()
}

const compile = (r) => ({
  pantry: [],
  tags: [],
  vibes: [],
  steps: [],
  ...r,
  template: r.name,
  name: (fills) => cap(fillText(r.name, fills)),
})

/** The live recipe list. Kept as one array (mutated in place) so every importer sees updates. */
export const TEMPLATES = RECIPES.map(compile)

/** Replace the recipe list, e.g. with the Firestore copy. Invalid entries are skipped. */
export function setRecipes(list) {
  const ok = (list || []).filter((r) => r && r.id && r.meal && r.name && Array.isArray(r.slots) && r.slots.length)
  if (!ok.length) return false
  TEMPLATES.splice(0, TEMPLATES.length, ...ok.map(compile))
  return true
}

export const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '☀️' },
  { id: 'lunch', label: 'Lunch', emoji: '🥪' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { id: 'snack', label: 'Snacks', emoji: '🍎' },
]
