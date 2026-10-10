// Store-bought shortcuts for recipes that make their own sauce: a jar replaces the pantry items
// (and any recipe slots, like the canned tomatoes) that only go into the sauce. Keyed by recipe id,
// kept out of recipes.json so the Firestore recipe set doesn't need to change.
//
// shortcut: { sauce, match, replaces: [pantry items], slots?: [slot keys], qty? (jars per serving), keep?: [words not to exclude] }

// Flyers mostly advertise sauce brands by family ("VH cooking or dipping sauces, selected
// varieties"), so each sauce also matches the brands that make it.
const ASIAN = ['vh', 'lee kum kee']
const INDIAN = ["patak's", 'patak', 'kfi cooking sauce', 'kfi sauce', 'shan cooking sauce', 'national cooking sauce', 'cooking sauce']

// Words that mean a flyer item is a meal made with the sauce, not the sauce itself.
const NOT_A_JAR = ['chicken', 'beef', 'pork', 'salmon', 'shrimp', 'crevettes', 'paneer', 'rice', 'riz', 'pasta', 'pâtes', 'dressing', 'vinaigrette', 'mayonnaise', 'noodle', 'noodles', 'ramen', 'jerky', 'bowl', 'frozen', 'chips', 'meatball', 'meatballs', 'wings', 'kit', 'seasoning', 'salad', 'soy', 'soya', 'soja', 'fish sauce', 'hot sauce', 'chili sauce']

const PASTA_SAUCE = { sauce: 'pasta sauce', match: ['pasta sauce', 'marinara', 'spaghetti sauce', 'sauce pour pâtes', 'sauce à spaghetti', 'tomato basil sauce', 'classico', 'prego', "rao's", 'tonnelli', 'stefano faita', 'catelli garden select', 'olivieri', 'tomatoes first'], replaces: ['italian seasoning', 'tomato paste'], slots: ['tomato', 'tomatoes'] }
const STIR_FRY = { sauce: 'stir-fry sauce', match: ['stir fry sauce', 'stir-fry sauce', 'sauce à sauté', 'sauce pour sautés', 'szechuan sauce', 'black bean sauce', 'kung pao sauce', ...ASIAN], replaces: ['soy sauce', 'garlic', 'ginger', 'hoisin sauce', 'cornstarch'] }
const GRAVY = { sauce: 'gravy', match: ['gravy', 'sauce brune', 'poutine sauce', 'sauce poutine', 'st-hubert', 'swiss chalet sauce'], replaces: ['flour', 'beef broth', 'worcestershire sauce'], qty: 0.25 }

export const SAUCES = {
  'stir-fry': STIR_FRY,
  'cashew-chicken': STIR_FRY,
  teriyaki: { sauce: 'teriyaki sauce', match: ['teriyaki sauce', 'sauce teriyaki', 'teriyaki marinade', ...ASIAN], replaces: ['soy sauce', 'honey', 'garlic', 'ginger', 'cornstarch', 'rice vinegar'] },
  'honey-garlic-chicken': { sauce: 'honey garlic sauce', match: ['honey garlic sauce', 'sauce miel et ail', 'honey garlic marinade', ...ASIAN], replaces: ['honey', 'garlic', 'soy sauce', 'cornstarch'] },
  'sweet-sour': { sauce: 'sweet & sour sauce', match: ['sweet and sour sauce', 'sweet & sour sauce', 'sauce aigre-douce', ...ASIAN], replaces: ['ketchup', 'rice vinegar', 'brown sugar', 'soy sauce', 'garlic', 'canned pineapple'] },
  'orange-chicken': { sauce: 'orange sauce', match: ['orange sauce', 'orange ginger sauce', "sauce à l'orange", 'mandarin orange sauce', ...ASIAN], replaces: ['soy sauce', 'honey', 'garlic', 'ginger', 'rice vinegar'], slots: ['fruit'] },
  'bulgogi-bowls': { sauce: 'Korean BBQ sauce', match: ['korean bbq sauce', 'korean barbecue sauce', 'bulgogi sauce', 'bulgogi marinade', 'galbi sauce', ...ASIAN], replaces: ['soy sauce', 'brown sugar', 'sesame oil', 'garlic', 'ginger', 'gochujang'] },
  'pad-thai': { sauce: 'pad thai sauce', match: ['pad thai sauce', 'sauce pad thaï', 'sauce pad thai'], replaces: ['fish sauce', 'brown sugar', 'ketchup', 'lime'] },
  'peanut-noodles': { sauce: 'peanut sauce', match: ['peanut sauce', 'satay sauce', 'sauce aux arachides'], replaces: ['soy sauce', 'lime', 'honey', 'sriracha', 'garlic', 'sesame oil'], slots: ['spread'] },
  curry: { sauce: 'curry simmer sauce', match: ['curry sauce', 'simmer sauce', 'korma sauce', 'tikka masala sauce', 'sauce cari', 'sauce au cari', 'curry cooking sauce', ...INDIAN], replaces: ['curry paste or powder', 'coconut milk', 'garlic'], slots: ['sauce'] },
  'butter-chicken': { sauce: 'butter chicken sauce', match: ['butter chicken sauce', 'sauce poulet au beurre', 'butter chicken simmer sauce', ...INDIAN], replaces: ['heavy cream', 'garam masala', 'ginger', 'garlic', 'onion'], slots: ['tomato'] },
  'fettuccine-alfredo': { sauce: 'Alfredo sauce', match: ['alfredo sauce', 'sauce alfredo', 'alfredo pasta sauce'], replaces: ['heavy cream', 'garlic'], slots: ['milk'] },
  'spaghetti-bolognese': PASTA_SAUCE,
  'spaghetti-meatballs': PASTA_SAUCE,
  'baked-ziti': PASTA_SAUCE,
  lasagna: PASTA_SAUCE,
  'meatball-subs': PASTA_SAUCE,
  'chicken-parm-subs': PASTA_SAUCE,
  'mozzarella-sticks': { ...PASTA_SAUCE, sauce: 'marinara sauce', qty: 0.15 },
  'sloppy-joes': { sauce: 'sloppy joe sauce', match: ['sloppy joe', 'manwich'], replaces: ['ketchup', 'brown sugar', 'worcestershire sauce', 'mustard'], slots: ['tomatoes'] },
  'shrimp-cocktail': { sauce: 'cocktail sauce', match: ['cocktail sauce', 'seafood sauce', 'sauce cocktail'], replaces: ['ketchup', 'horseradish', 'lemon juice', 'hot sauce'], qty: 0.15 },
  'buffalo-cauliflower-bites': { sauce: 'buffalo wing sauce', match: ['buffalo sauce', 'wing sauce', 'buffalo wing sauce', 'redhot'], keep: ['hot sauce'], replaces: ['hot sauce', 'butter'], qty: 0.15 },
  'swedish-meatballs': GRAVY,
  'salisbury-steak': GRAVY,
  'bangers-mash': GRAVY,
  poutine: GRAVY,
}

const ingredients = new Map()

/** The jar as a grocery ingredient (one object per sauce, so deal matching can memoize it). */
export function sauceIngredient(recipeId) {
  const s = SAUCES[recipeId]
  if (!s) return null
  if (!ingredients.has(s.sauce)) {
    ingredients.set(s.sauce, {
      item: s.sauce,
      unit: 'jar',
      qty: s.qty ?? 0.25,
      pkg: 1,
      aisle: 'Pantry',
      match: s.match,
      has: [],
      allow: ['sauce', 'marinade', 'paste'],
      // "Butter chicken sauce" and "sauce pour pâtes" name the very words that usually mean a meal.
      exclude: NOT_A_JAR.filter((w) => !s.keep?.includes(w) && !s.match.some((m) => m.toLowerCase().split(/\s+/).includes(w))),
    })
  }
  return ingredients.get(s.sauce)
}
