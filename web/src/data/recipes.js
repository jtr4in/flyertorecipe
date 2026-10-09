// Seed recipes for the rule-based planner. Each ingredient lists the flyer
// words that count as a match. `main` ingredients weigh 3x when scoring;
// `pantry` items (oil, spices) are assumed on hand and never priced.
const i = (item, qty, unit, aisle, match, opts = {}) => ({ item, qty, unit, aisle, match, ...opts })
const P = (item) => ({ item, pantry: true, qty: 0, unit: '', aisle: 'Pantry', match: [] })

const onion = i('onion', 1, 'each', 'Produce', ['onion'], { exclude: ['green onion', 'rings'] })
const garlic = P('garlic')
const oil = P('cooking oil')
const salt = P('salt & pepper')

export const RECIPES = [
  {
    id: 'sheet-pan-chicken', name: 'Sheet-pan chicken thighs & potatoes', servings: 4, minutes: 45,
    protein: 'chicken', tags: ['high-protein', 'gluten-free', 'dairy-free'],
    ingredients: [
      i('chicken thighs', 2, 'lb', 'Meat & Seafood', ['chicken thigh', 'chicken drumstick', 'chicken leg'], { main: true }),
      i('potatoes', 2, 'lb', 'Produce', ['potato'], { exclude: ['sweet', 'chips', 'fries'] }),
      i('carrots', 1, 'lb', 'Produce', ['carrot'], { exclude: ['cake'] }),
      onion, oil, salt, P('dried herbs'),
    ],
  },
  {
    id: 'chicken-stir-fry', name: 'Chicken & broccoli stir-fry', servings: 4, minutes: 25,
    protein: 'chicken', tags: ['high-protein', 'dairy-free'],
    ingredients: [
      i('chicken breast', 1.5, 'lb', 'Meat & Seafood', ['chicken breast'], { main: true }),
      i('broccoli', 1, 'head', 'Produce', ['broccoli'], { exclude: ['frozen'] }),
      i('bell peppers', 2, 'each', 'Produce', ['pepper'], { exclude: ['pepperoni', 'black pepper', 'peppercorn'] }),
      i('rice', 2, 'cup', 'Pantry', ['rice'], { exclude: ['cake', 'krispies', 'crispy'] }),
      P('soy sauce'), garlic, oil,
    ],
  },
  {
    id: 'chicken-tacos', name: 'Chicken tacos with salsa', servings: 4, minutes: 30,
    protein: 'chicken', tags: ['high-protein'],
    ingredients: [
      i('chicken breast', 1.5, 'lb', 'Meat & Seafood', ['chicken breast'], { main: true }),
      i('tortillas', 1, 'pack', 'Bakery', ['tortilla'], { exclude: ['chips'] }),
      i('lettuce', 1, 'head', 'Produce', ['lettuce', 'romaine']),
      i('tomatoes', 3, 'each', 'Produce', ['tomato'], { exclude: ['canned', 'sauce', 'paste', 'diced'] }),
      i('cheddar', 1, 'cup', 'Dairy & Eggs', ['cheddar', 'cheese'], { exclude: ['cream cheese', 'cheesecake'] }),
      P('taco spices'), oil,
    ],
  },
  {
    id: 'beef-chili', name: 'Beef & bean chili', servings: 6, minutes: 50,
    protein: 'beef', tags: ['high-protein', 'gluten-free', 'dairy-free'],
    ingredients: [
      i('ground beef', 1.5, 'lb', 'Meat & Seafood', ['ground beef', 'lean ground'], { main: true }),
      i('canned beans', 2, 'can', 'Pantry', ['kidney bean', 'black bean', 'canned bean'], { exclude: ['green bean', 'coffee', 'jelly', 'baked'] }),
      i('canned tomatoes', 2, 'can', 'Pantry', ['canned tomato', 'diced tomato', 'crushed tomato', 'tomatoes'], { exclude: ['fresh', 'grape', 'cherry', 'roma', 'vine'] }),
      onion, i('bell peppers', 1, 'each', 'Produce', ['pepper'], { exclude: ['pepperoni', 'black pepper', 'peppercorn'] }),
      P('chili powder'), garlic, oil,
    ],
  },
  {
    id: 'spaghetti-bolognese', name: 'Spaghetti bolognese', servings: 4, minutes: 40,
    protein: 'beef', tags: ['high-protein'],
    ingredients: [
      i('ground beef', 1, 'lb', 'Meat & Seafood', ['ground beef', 'lean ground'], { main: true }),
      i('pasta', 1, 'lb', 'Pantry', ['pasta', 'spaghetti', 'penne', 'rotini'], { exclude: ['sauce', 'salad'] }),
      i('canned tomatoes', 1, 'can', 'Pantry', ['canned tomato', 'diced tomato', 'crushed tomato', 'pasta sauce'], {}),
      onion, i('carrots', 1, 'each', 'Produce', ['carrot'], { exclude: ['cake'] }), garlic, oil,
    ],
  },
  {
    id: 'beef-rice-bowls', name: 'Korean-style beef rice bowls', servings: 4, minutes: 25,
    protein: 'beef', tags: ['high-protein', 'dairy-free'],
    ingredients: [
      i('ground beef', 1, 'lb', 'Meat & Seafood', ['ground beef', 'lean ground'], { main: true }),
      i('rice', 2, 'cup', 'Pantry', ['rice'], { exclude: ['cake', 'krispies', 'crispy'] }),
      i('carrots', 2, 'each', 'Produce', ['carrot'], { exclude: ['cake'] }),
      i('spinach', 1, 'bag', 'Produce', ['spinach']),
      i('eggs', 4, 'each', 'Dairy & Eggs', ['egg'], { exclude: ['eggplant', 'nog', 'noodle'] }),
      P('soy sauce'), garlic,
    ],
  },
  {
    id: 'pork-chops-apples', name: 'Pork chops with roasted apples', servings: 4, minutes: 35,
    protein: 'pork', tags: ['high-protein', 'gluten-free', 'dairy-free'],
    ingredients: [
      i('pork chops', 4, 'each', 'Meat & Seafood', ['pork chop', 'pork loin'], { main: true }),
      i('apples', 3, 'each', 'Produce', ['apple'], { exclude: ['juice', 'sauce', 'pie'] }),
      i('potatoes', 1.5, 'lb', 'Produce', ['potato'], { exclude: ['sweet', 'chips', 'fries'] }),
      onion, oil, salt,
    ],
  },
  {
    id: 'pork-fried-rice', name: 'Pork & veggie fried rice', servings: 4, minutes: 25,
    protein: 'pork', tags: ['dairy-free'],
    ingredients: [
      i('pork', 1, 'lb', 'Meat & Seafood', ['pork'], { main: true, exclude: ['rind', 'skin'] }),
      i('rice', 2, 'cup', 'Pantry', ['rice'], { exclude: ['cake', 'krispies', 'crispy'] }),
      i('frozen mixed vegetables', 1, 'bag', 'Frozen', ['frozen vegetable', 'frozen mixed', 'mixed vegetables']),
      i('eggs', 3, 'each', 'Dairy & Eggs', ['egg'], { exclude: ['eggplant', 'nog', 'noodle'] }),
      P('soy sauce'), oil,
    ],
  },
  {
    id: 'baked-salmon', name: 'Baked salmon, rice & broccoli', servings: 4, minutes: 30,
    protein: 'fish', tags: ['high-protein', 'gluten-free', 'dairy-free'],
    ingredients: [
      i('salmon fillets', 1.5, 'lb', 'Meat & Seafood', ['salmon'], { main: true, exclude: ['smoked', 'canned'] }),
      i('rice', 2, 'cup', 'Pantry', ['rice'], { exclude: ['cake', 'krispies', 'crispy'] }),
      i('broccoli', 1, 'head', 'Produce', ['broccoli'], { exclude: ['frozen'] }),
      P('lemon'), oil, salt,
    ],
  },
  {
    id: 'shrimp-pasta', name: 'Garlic shrimp pasta', servings: 4, minutes: 25,
    protein: 'fish', tags: ['high-protein'],
    ingredients: [
      i('shrimp', 1, 'lb', 'Meat & Seafood', ['shrimp', 'prawn'], { main: true, exclude: ['ring', 'chips', 'surimi', 'pasta', 'alfredo', 'tempura', 'dumpling', 'ravioli', 'raviolis'] }),
      i('pasta', 1, 'lb', 'Pantry', ['pasta', 'spaghetti', 'linguine', 'penne'], { exclude: ['sauce', 'salad'] }),
      i('spinach', 1, 'bag', 'Produce', ['spinach']),
      i('butter', 0.25, 'cup', 'Dairy & Eggs', ['butter'], { exclude: ['peanut', 'chicken', 'cookie', 'lettuce', 'croissant'] }),
      garlic, salt,
    ],
  },
  {
    id: 'veggie-frittata', name: 'Spinach & cheese frittata', servings: 4, minutes: 30,
    protein: 'egg', tags: ['vegetarian', 'high-protein', 'gluten-free'],
    ingredients: [
      i('eggs', 10, 'each', 'Dairy & Eggs', ['egg'], { main: true, exclude: ['eggplant', 'nog', 'noodle'] }),
      i('spinach', 1, 'bag', 'Produce', ['spinach']),
      i('cheddar', 1, 'cup', 'Dairy & Eggs', ['cheddar', 'cheese'], { exclude: ['cream cheese', 'cheesecake'] }),
      i('potatoes', 1, 'lb', 'Produce', ['potato'], { exclude: ['sweet', 'chips', 'fries'] }),
      onion, oil, salt,
    ],
  },
  {
    id: 'shakshuka', name: 'Shakshuka with crusty bread', servings: 4, minutes: 30,
    protein: 'egg', tags: ['vegetarian', 'dairy-free'],
    ingredients: [
      i('eggs', 8, 'each', 'Dairy & Eggs', ['egg'], { main: true, exclude: ['eggplant', 'nog', 'noodle'] }),
      i('canned tomatoes', 2, 'can', 'Pantry', ['canned tomato', 'diced tomato', 'crushed tomato'], {}),
      i('bell peppers', 2, 'each', 'Produce', ['pepper'], { exclude: ['pepperoni', 'black pepper', 'peppercorn'] }),
      i('bread', 1, 'loaf', 'Bakery', ['bread', 'baguette', 'loaf'], { exclude: ['crumb'] }),
      onion, P('cumin & paprika'), oil,
    ],
  },
  {
    id: 'lentil-curry', name: 'Red lentil curry', servings: 4, minutes: 35,
    protein: 'legume', tags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
    ingredients: [
      i('red lentils', 2, 'cup', 'Pantry', ['lentil'], { main: true, exclude: ['chips', 'soup'] }),
      i('canned tomatoes', 1, 'can', 'Pantry', ['canned tomato', 'diced tomato', 'crushed tomato'], {}),
      i('spinach', 1, 'bag', 'Produce', ['spinach']),
      i('rice', 2, 'cup', 'Pantry', ['rice'], { exclude: ['cake', 'krispies', 'crispy'] }),
      onion, P('curry powder'), P('coconut milk'), garlic,
    ],
  },
  {
    id: 'black-bean-burritos', name: 'Black bean & rice burritos', servings: 4, minutes: 25,
    protein: 'legume', tags: ['vegetarian'],
    ingredients: [
      i('canned black beans', 2, 'can', 'Pantry', ['black bean', 'canned bean'], { main: true, exclude: ['green bean', 'coffee', 'jelly', 'baked'] }),
      i('rice', 1.5, 'cup', 'Pantry', ['rice'], { exclude: ['cake', 'krispies', 'crispy'] }),
      i('tortillas', 1, 'pack', 'Bakery', ['tortilla'], { exclude: ['chips'] }),
      i('cheddar', 1, 'cup', 'Dairy & Eggs', ['cheddar', 'cheese'], { exclude: ['cream cheese', 'cheesecake'] }),
      i('bell peppers', 1, 'each', 'Produce', ['pepper'], { exclude: ['pepperoni', 'black pepper', 'peppercorn'] }),
      onion, P('salsa'), P('taco spices'),
    ],
  },
  {
    id: 'chickpea-pasta', name: 'Tomato chickpea pasta', servings: 4, minutes: 25,
    protein: 'legume', tags: ['vegetarian', 'vegan', 'dairy-free'],
    ingredients: [
      i('pasta', 1, 'lb', 'Pantry', ['pasta', 'penne', 'rotini', 'spaghetti'], { exclude: ['sauce', 'salad'] }),
      i('canned chickpeas', 1, 'can', 'Pantry', ['chickpea', 'canned bean'], { main: true, exclude: ['green bean', 'coffee', 'jelly', 'baked'] }),
      i('canned tomatoes', 1, 'can', 'Pantry', ['canned tomato', 'diced tomato', 'crushed tomato'], {}),
      i('spinach', 1, 'bag', 'Produce', ['spinach']),
      onion, garlic, oil,
    ],
  },
  {
    id: 'tofu-stir-fry', name: 'Crispy tofu & veggie stir-fry', servings: 4, minutes: 30,
    protein: 'tofu', tags: ['vegetarian', 'vegan', 'high-protein', 'dairy-free'],
    ingredients: [
      i('firm tofu', 2, 'block', 'Plant Protein', ['tofu'], { main: true }),
      i('broccoli', 1, 'head', 'Produce', ['broccoli'], { exclude: ['frozen'] }),
      i('bell peppers', 2, 'each', 'Produce', ['pepper'], { exclude: ['pepperoni', 'black pepper', 'peppercorn'] }),
      i('rice', 2, 'cup', 'Pantry', ['rice'], { exclude: ['cake', 'krispies', 'crispy'] }),
      P('soy sauce'), garlic, oil,
    ],
  },
  {
    id: 'peanut-tofu-noodles', name: 'Peanut tofu noodles', servings: 4, minutes: 25,
    protein: 'tofu', tags: ['vegetarian', 'vegan', 'high-protein', 'dairy-free'],
    ingredients: [
      i('firm tofu', 1, 'block', 'Plant Protein', ['tofu'], { main: true }),
      i('pasta or noodles', 1, 'lb', 'Pantry', ['noodle', 'spaghetti', 'pasta'], { exclude: ['sauce', 'instant', 'cup'] }),
      i('peanut butter', 0.5, 'cup', 'Pantry', ['peanut butter']),
      i('carrots', 2, 'each', 'Produce', ['carrot'], { exclude: ['cake'] }),
      i('bell peppers', 1, 'each', 'Produce', ['pepper'], { exclude: ['pepperoni', 'black pepper', 'peppercorn'] }),
      P('soy sauce'), garlic,
    ],
  },
  {
    id: 'mac-cheese-broccoli', name: 'Stovetop mac & cheese with broccoli', servings: 4, minutes: 25,
    protein: 'cheese', tags: ['vegetarian'],
    ingredients: [
      i('pasta', 1, 'lb', 'Pantry', ['macaroni', 'pasta', 'elbow'], { exclude: ['sauce', 'salad', 'dinner'] }),
      i('cheddar', 2, 'cup', 'Dairy & Eggs', ['cheddar', 'cheese'], { main: true, exclude: ['cream cheese', 'cheesecake'] }),
      i('milk', 2, 'cup', 'Dairy & Eggs', ['milk'], { exclude: ['chocolate', 'almond', 'oat milk', 'coconut'] }),
      i('broccoli', 1, 'head', 'Produce', ['broccoli'], { exclude: ['frozen'] }),
      i('butter', 0.25, 'cup', 'Dairy & Eggs', ['butter'], { exclude: ['peanut', 'chicken', 'cookie', 'lettuce', 'croissant'] }),
      salt,
    ],
  },
  {
    id: 'turkey-burgers', name: 'Turkey burgers & salad', servings: 4, minutes: 30,
    protein: 'poultry', tags: ['high-protein', 'dairy-free'],
    ingredients: [
      i('ground turkey', 1.5, 'lb', 'Meat & Seafood', ['ground turkey'], { main: true, exclude: ['deli', 'sliced', 'bacon'] }),
      i('buns', 1, 'pack', 'Bakery', ['bun', 'kaiser'], {}),
      i('lettuce', 1, 'head', 'Produce', ['lettuce', 'romaine']),
      i('tomatoes', 2, 'each', 'Produce', ['tomato'], { exclude: ['canned', 'sauce', 'paste', 'diced'] }),
      onion, salt,
    ],
  },
  {
    id: 'sausage-peppers', name: 'Sausage, peppers & potatoes', servings: 4, minutes: 40,
    protein: 'pork', tags: ['high-protein', 'gluten-free', 'dairy-free'],
    ingredients: [
      i('sausages', 1.5, 'lb', 'Meat & Seafood', ['sausage'], { main: true, exclude: ['breakfast', 'roll'] }),
      i('bell peppers', 3, 'each', 'Produce', ['pepper'], { exclude: ['pepperoni', 'black pepper', 'peppercorn'] }),
      i('potatoes', 2, 'lb', 'Produce', ['potato'], { exclude: ['sweet', 'chips', 'fries'] }),
      onion, oil, salt,
    ],
  },
  {
    id: 'yogurt-oats-bake', name: 'Baked berry oatmeal (make-ahead breakfast)', servings: 6, minutes: 40,
    protein: 'dairy', tags: ['vegetarian', 'gluten-free'],
    ingredients: [
      i('rolled oats', 3, 'cup', 'Pantry', ['oat'], { main: true, exclude: ['milk', 'bar', 'cookie'] }),
      i('berries', 2, 'cup', 'Produce', ['berry', 'berries', 'blueberries', 'strawberries', 'raspberries'], { exclude: ['juice', 'jam', 'cereal'] }),
      i('milk', 2, 'cup', 'Dairy & Eggs', ['milk'], { exclude: ['chocolate', 'almond', 'oat milk', 'coconut'] }),
      i('eggs', 2, 'each', 'Dairy & Eggs', ['egg'], { exclude: ['eggplant', 'nog', 'noodle'] }),
      i('yogurt', 1, 'tub', 'Dairy & Eggs', ['yogurt', 'yoghurt'], {}),
      P('maple syrup'),
    ],
  },
]
