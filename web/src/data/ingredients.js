// Ingredient catalog, grouped into the slots meal templates draw from. The planner fills
// each slot with whatever in the group is on sale this week, so meals follow the flyers.
//
// pkg is how many of `unit` one flyer package holds (default 1); lb is what one package weighs,
// for flyers that price it per lb or per 100 g (cheese, mushrooms, berries).
// qty is per serving, in `unit`. `has` lists what the item contains, for diet filtering:
// meat, fish, dairy, egg, gluten. `match`/`exclude` are flyer words (see planner.matchDeal);
// `allow` lifts words the planner normally rejects everywhere ("chips", "flavour").
const x = (item, unit, qty, aisle, match, opts = {}) => ({ item, unit, qty, aisle, match, has: [], ...opts })

const MEAT = ['meat']
const FISH = ['fish']
const DAIRY = ['dairy']
const EGG = ['egg']
const GLUTEN = ['gluten']

export const CATALOG = {
  poultry: [
    x('chicken breasts', 'lb', 0.33, 'Meat & Seafood', ['chicken breast', 'poitrine de poulet', 'poitrines de poulet'], {as: 'chicken', has: MEAT, exclude: ['stuffed', 'roast', 'rôti', 'breaded', 'nugget', 'strips', 'deli', 'sliced'], pkg: 2 }),
    x('chicken thighs', 'lb', 0.35, 'Meat & Seafood', ['chicken thigh', 'chicken drumstick', 'chicken leg', 'cuisse de poulet', 'cuisses de poulet', 'pilons de poulet', 'haut de cuisse'], {as: 'chicken thigh', has: MEAT, exclude: ['breaded', 'wings'], pkg: 2 }),
    x('whole chicken', 'lb', 0.6, 'Meat & Seafood', ['whole chicken', 'roasting chicken', 'poulet entier'], {has: MEAT, exclude: ['wing', 'wings', 'aile'], pkg: 4 }),
    // Big or special cuts: only recipes that name them (in a slot's `only`) can pick them, so a
    // weeknight stir-fry never turns into a whole turkey.
    x('whole turkey', 'lb', 0.75, 'Meat & Seafood', ['whole turkey', 'fresh turkey', 'frozen turkey', 'grade a turkey', 'butterball turkey', 'dinde fraîche', 'dindes fraîches', 'dindon'], {as: 'turkey', has: MEAT, exclude: ['ground', 'breast', 'poitrine', 'deli', 'sliced', 'bacon', 'sausage', 'gravy', 'stuffed', 'gift', 'burger', 'hachée', 'feast', 'served'], pkg: 12, explicit: true }),
    x('turkey breast', 'lb', 0.4, 'Meat & Seafood', ['turkey breast', 'poitrine de dinde'], {has: MEAT, exclude: ['rôtie', 'roasted', 'mclean', 'stuffed', 'deli', 'sliced', 'shaved', 'smoked', 'émincé', 'première moisson', 'cuddy', 'selection', 'halal'], pkg: 2.5, explicit: true }),
    x('chicken wings', 'lb', 0.5, 'Meat & Seafood', ['chicken wing', 'ailes de poulet'], {as: 'wings', has: MEAT, exclude: ['st-hubert', 'la cage', 'st. louis', 'bites', 'nuggets', 'breaded', 'panées', 'cooked', 'cuites', 'pub', 'pinty', 'sauce', 'dip'], pkg: 2, explicit: true }),
  ],
  pork: [
    x('pork chops', 'lb', 0.33, 'Meat & Seafood', ['pork chop', 'pork loin', 'loin chop', 'rib chop', 'côtelette de porc', 'côtelettes de porc', 'longe de porc'], {as: 'pork', has: MEAT, exclude: ['veal', 'roast'], pkg: 1.5 }),
    x('pork tenderloin', 'lb', 0.33, 'Meat & Seafood', ['pork tenderloin', 'filet de porc', 'filets de porc'], {as: 'pork tenderloin', has: MEAT, pkg: 1 }),
    x('sausages', 'lb', 0.3, 'Meat & Seafood', ['sausage', 'saucisse'], {as: 'sausage', has: MEAT, exclude: ['pâte', 'pillsbury', 'penne', 'dry', 'sec', 'secs', 'saucisson', 'saucissons', 'salami', 'stuffing', 'deli', 'bologna', 'summer', 'breakfast', 'roll', 'pizza', 'cocktail', 'hot dog', 'wiener', 'sausage roll', 'vegan', 'végane', 'véganes', 'plant-based', 'veggie'], pkg: 1 }),
    x('ham', 'lb', 0.4, 'Meat & Seafood', ['smoked ham', 'bone-in ham', 'boneless ham', 'spiral ham', 'honey ham', 'ham quarter', 'portion ham', 'jambon fumé', 'quart de jambon', 'jambonneau'], {has: MEAT, exclude: ['jambon blanc', 'deli', 'shaved', 'sliced cooked', 'black forest', 'émincé', 'pulled', 'effiloché', 'prosciutto', 'salami', 'canned', 'flaked', 'première moisson', 'selection', 'service case', 'comptoir'], pkg: 5, explicit: true }),
    x('pork ribs', 'lb', 0.75, 'Meat & Seafood', ['back ribs', 'side ribs', 'pork rib', 'côtes levées', 'st. louis', 'spare ribs'], {as: 'ribs', has: MEAT, exclude: ['chicken', 'fall off the bone', 'cooked', 'cuites', 'beef', 'boeuf'], pkg: 2.5, explicit: true }),
    x('pork shoulder', 'lb', 0.4, 'Meat & Seafood', ['pork shoulder', 'pork butt', 'picnic roast', 'shoulder blade roast', 'épaule de porc', 'soc de porc'], {has: MEAT, exclude: ['steaks'], pkg: 4, explicit: true }),
  ],
  beef: [
    x('steak', 'lb', 0.4, 'Meat & Seafood', ['beef steak', 'striploin', 'strip loin', 'sirloin', 'rib eye', 'ribeye', 't-bone', 'tournedos', 'contre-filet', "bifteck d'aloyau", 'grilling steak', 'new york steak'], {has: MEAT, exclude: ['tip roast', 'meatball', 'meatballs', 'veal', 'ground', 'shaved', 'smoked meat', 'pork', 'porc', 'salmon', 'saumon', 'bacon', 'burger', 'sandwich', 'pizza', 'salad', 'jerky'], pkg: 1.5 }),
    x('beef roast', 'lb', 0.4, 'Meat & Seafood', ['beef roast', 'rib roast', 'cross rib', 'blade roast', 'pot roast', 'chuck roast', 'rump roast', 'sirloin tip roast', 'prime rib', 'rôti de boeuf', 'rôti de palette'], {as: 'roast', has: MEAT, exclude: ['veal', 'slow cooked', 'deli', 'sliced', 'shaved', 'turkey', 'dinde', 'pork', 'porc', 'chicken', 'sandwich', 'served', 'potatoes'], pkg: 3 }),
    x('stewing beef', 'lb', 0.33, 'Meat & Seafood', ['stewing beef', 'stewing cubes', 'beef stew', 'stew beef', 'boeuf à ragoût', 'cubes de boeuf'], {as: 'beef', has: MEAT, exclude: ['classic', 'frozen', 'canned', 'dinty'], pkg: 1.5 }),
  ],
  ground: [
    x('ground beef', 'lb', 0.25, 'Meat & Seafood', ['ground beef', 'boeuf haché'], {has: MEAT, exclude: ['bites', 'burger', 'burgers', 'pork', 'porc', 'turkey', 'chicken'], pkg: 1 }),
    x('ground turkey', 'lb', 0.25, 'Meat & Seafood', ['ground turkey', 'dinde hachée'], {has: MEAT, pkg: 1 }),
    x('ground pork', 'lb', 0.25, 'Meat & Seafood', ['ground pork', 'porc haché'], {has: MEAT, pkg: 1 }),
    x('ground chicken', 'lb', 0.25, 'Meat & Seafood', ['ground chicken', 'poulet haché'], {has: MEAT, pkg: 1 }),
  ],
  fish: [
    x('salmon', 'lb', 0.33, 'Meat & Seafood', ['salmon', 'saumon'], {has: FISH, exclude: ['stuffed', 'tartare', 'wellington', 'served', 'bouées', 'boursin', 'fromage', 'fumé', 'fumée', 'smoked steelhead', 'smoked', 'canned', 'roast', 'clover leaf', 'gold seal', 'saumon rose', 'pink'], pkg: 1 }),
    x('white fish', 'lb', 0.33, 'Meat & Seafood', ['tilapia', 'basa', 'haddock', 'cod fillet', 'pollock', 'sole fillet'], {as: 'white fish', has: FISH, exclude: ['breaded', 'battered', 'pasta'], pkg: 1 }),
    x('shrimp', 'lb', 0.25, 'Meat & Seafood', ['shrimp', 'prawn', 'crevette'], {has: FISH, exclude: ['appetizer', 'appetizers', 'hors-d', 'poké', 'fettuccine', 'dried', 'breaded', 'panés', 'coconut', 'stuffed', 'plateau', 'ring', 'surimi', 'pasta', 'cooked', 'tempura'], pkg: 0.75 }),
  ],
  plantProtein: [
    x('firm tofu', 'block', 0.33, 'Plant Protein', ['tofu'], { lb: 1, as: 'tofu', exclude: ['poké', 'hummus', 'trempette', 'dessert', 'pudding'] }),
    x('chickpeas', 'can', 0.33, 'Pantry', ['chickpea'], { as: 'chickpea', exclude: ['flour', 'snack'] }),
    x('black beans', 'can', 0.33, 'Pantry', ['black bean'], {as: 'black bean', exclude: ['salted', 'fermented', 'fish', 'dace'] }),
    x('lentils', 'cup', 0.25, 'Pantry', ['lentil'], {as: 'lentil', exclude: ['burger', 'burgers', 'chips', 'soup', 'snack'], pkg: 5 }),
  ],
  eggs: [x('eggs', 'each', 2, 'Dairy & Eggs', ['egg'], { as: 'egg', has: EGG, exclude: ['eggplant', 'nog', 'noodle', 'chocolate', 'roll', 'quail', 'yolk', 'custard', 'bread', 'puff', 'tart', 'cake', 'salted'], pkg: 12 })],
  cookingVeg: [
    x('broccoli', 'head', 0.25, 'Produce', ['broccoli', 'brocoli'], { lb: 1.2, exclude: ['salad', 'gratin', 'bouées', 'frozen', 'slaw'] }),
    x('bell peppers', 'each', 0.5, 'Produce', ['pepper'], {exclude: ['roasted', 'hummus', 'stuffed', 'dr', 'chili', 'jalapeño', 'linguine', 'porchetta', 'olives', 'pepperoni', 'black pepper', 'peppercorn', 'jalapeno', 'hot'], pkg: 3 }),
    x('green beans', 'lb', 0.2, 'Produce', ['green bean'], {exclude: ['canned', 'frozen'], pkg: 1 }),
    x('zucchini', 'each', 0.5, 'Produce', ['zucchini'], {pkg: 2 }),
    x('cauliflower', 'head', 0.25, 'Produce', ['cauliflower'], { lb: 2, exclude: ['gratin', 'gratins', 'frozen', 'rice', 'pizza'] }),
    x('mushrooms', 'pack', 0.25, 'Produce', ['mushroom'], { lb: 0.5, exclude: ['stuffed', 'battered', 'truffle', 'ml', 'soup', 'canned', 'dried', 'carrot', 'onion'] }),
    x('carrots', 'lb', 0.2, 'Produce', ['carrot'], {exclude: ['cake', 'juice'], pkg: 2 }),
    x('asparagus', 'bunch', 0.25, 'Produce', ['asparagus'], { lb: 1 }),
    x('brussels sprouts', 'lb', 0.25, 'Produce', ['brussels sprout'], {pkg: 1 }),
    x('squash', 'each', 0.25, 'Produce', ['squash'], { lb: 2 }),
    x('frozen mixed vegetables', 'bag', 0.2, 'Frozen', ['frozen vegetable', 'frozen mixed', 'mixed vegetables', 'stir fry vegetables', 'stir-fry vegetables'], {as: 'mixed veggie', }),
  ],
  greens: [
    x('lettuce', 'head', 0.25, 'Produce', ['lettuce', 'romaine'], { lb: 1.2, exclude: ['butter lettuce kit'] }),
    x('spinach', 'bag', 0.2, 'Produce', ['spinach'], { lb: 0.5, exclude: ['dip', 'frozen'] }),
    x('salad greens', 'pack', 0.2, 'Produce', ['spring mix', 'mixed greens', 'salad blend', 'salad kit'], {as: 'greens', }),
    x('kale', 'bunch', 0.25, 'Produce', ['kale'], { lb: 0.75, exclude: ['chips'] }),
  ],
  saladVeg: [
    x('cucumber', 'each', 0.33, 'Produce', ['cucumber'], {pkg: 1 }),
    x('tomatoes', 'lb', 0.2, 'Produce', ['tomato'], {exclude: ['canned', 'sauce', 'paste', 'diced', 'crushed', 'juice', 'soup', 'ketchup'], pkg: 1 }),
    x('bell peppers', 'each', 0.33, 'Produce', ['pepper'], {exclude: ['pepperoni', 'black pepper', 'peppercorn', 'jalapeno', 'hot'], pkg: 3 }),
    x('carrots', 'lb', 0.15, 'Produce', ['carrot'], {exclude: ['cake', 'juice'], pkg: 2 }),
    x('celery', 'bunch', 0.15, 'Produce', ['celery'], { lb: 1.5 }),
  ],
  starch: [
    x('rice', 'cup', 0.33, 'Pantry', ['rice'], {exclude: ['cake', 'krispies', 'crispy', 'vinegar', 'noodle', 'pudding', 'precooked', 'minute', 'instant', 'ready', 'masala', 'curry', 'pilaf', 'bowl', 'meal', 'snack', 'snacks', 'cracker', 'crackers', 'chips', 'riz soufflé', 'served', 'cooker', 'chicken', 'pulses', 'feast', 'salmon', 'lamb'], pkg: 10 }),
    x('pasta', 'lb', 0.2, 'Pantry', ['pasta', 'spaghetti', 'penne', 'rotini', 'fusilli', 'linguine', 'macaroni'], {has: GLUTEN, exclude: ['squash', 'sauce', 'meal', 'heinz', 'clam', 'palourdes', 'chicken', 'shrimp', 'beef', 'sausage', 'bolognese', 'ravioli', 'stuffed', 'frozen', 'konjac', 'lasagna', 'salad', 'dinner', 'kit', 'cheese', 'fromage', 'kd', 'kraft dinner'], pkg: 2 }),
    x('potatoes', 'lb', 0.4, 'Produce', ['potato'], {exclude: ['sweet', 'chips', 'fries', 'salad', 'mashed', 'instant', 'hash brown', 'tots', 'skins', 'scalloped', 'perogies', 'betty crocker', 'mccain', 'frozen', 'twice baked', 'gratin', 'starch', 'crisp', 'parisian', 'beef', 'oranges', 'breakfast', 'bistro'], pkg: 5 }),
    x('sweet potatoes', 'lb', 0.4, 'Produce', ['sweet potato', 'yam', 'patates douces'], {exclude: ['fries', 'chips', 'spread', 'mash', 'glazed', 'cubed'], pkg: 3 }),
    x('quinoa', 'cup', 0.25, 'Pantry', ['quinoa'], {pkg: 5 }),
    x('egg noodles', 'lb', 0.2, 'Pantry', ['egg noodle', 'no yolks', 'nouilles aux oeufs', 'nouilles aux œufs'], {has: GLUTEN, exclude: ['instant', 'cup', 'soup', 'ramen'], pkg: 1 }),
  ],
  wraps: [
    x('tortillas', 'pack', 0.2, 'Bakery', ['tortilla'], { has: GLUTEN, exclude: ['croustilles', 'poulet', 'césar', 'aïoli', 'chips'] }),
    x('pitas', 'pack', 0.2, 'Bakery', ['pita'], { has: GLUTEN, exclude: ['chips'] }),
    x('naan', 'pack', 0.25, 'Bakery', ['naan'], { has: GLUTEN }),
  ],
  bread: [
    x('bread', 'loaf', 0.1, 'Bakery', ['bread', 'loaf'], { has: GLUTEN, exclude: ['crumb', 'raisin', 'garlic', 'banana'] }),
    x('bagels', 'pack', 0.17, 'Bakery', ['bagel'], { has: GLUTEN, exclude: ['chips', 'bites'] }),
    x('English muffins', 'pack', 0.17, 'Bakery', ['english muffin'], { has: GLUTEN }),
  ],
  buns: [x('buns', 'pack', 0.125, 'Bakery', ['bun', 'kaiser'], { has: GLUTEN, exclude: ['fish shaped', 'specialty', 'filled', 'tiramisu', 'cream', 'custard', 'sweet', 'red bean', 'pineapple', 'coconut', 'steamed', 'bao', 'cinnamon', 'hot cross'] })],
  fruit: [
    x('apples', 'each', 1, 'Produce', ['apple'], {exclude: ['juice', 'sauce', 'pie', 'chips', 'cider', 'turnover'], pkg: 6 }),
    x('bananas', 'each', 1, 'Produce', ['banana'], {exclude: ['bread', 'chips', 'muffin'], pkg: 6 }),
    x('strawberries', 'pack', 0.25, 'Produce', ['strawberries', 'strawberry'], { lb: 1, exclude: ['shortcake', 'cake', 'jam', 'yogurt', 'juice', 'cereal'] }),
    x('blueberries', 'pack', 0.25, 'Produce', ['blueberries', 'blueberry'], { lb: 0.7, exclude: ['muffin', 'jam', 'juice', 'cereal'] }),
    x('grapes', 'lb', 0.25, 'Produce', ['grape'], {exclude: ['juice', 'jelly', 'tomato', 'fruit'], pkg: 2 }),
    x('oranges', 'each', 1, 'Produce', ['orange', 'clementine', 'mandarin'], {exclude: ['juice', 'marmalade', 'sweet potato', 'pepper', 'crush'], pkg: 8 }),
    x('pears', 'each', 1, 'Produce', ['pear'], {exclude: ['juice', 'canned'], pkg: 6 }),
  ],
  frozenFruit: [x('frozen fruit', 'bag', 0.15, 'Frozen', ['frozen fruit', 'frozen berries', 'frozen mango', 'frozen strawberries', 'frozen blueberries'], {})],
  yogurt: [x('yogurt', 'tub', 0.2, 'Dairy & Eggs', ['yogurt', 'yoghurt', 'yogourt'], { has: DAIRY, exclude: ['drink', 'tube', 'frozen', 'bar'] })],
  milk: [x('milk', 'carton', 0.1, 'Dairy & Eggs', ['milk'], { has: DAIRY, exclude: ['carnation', 'rusk', 'cake', 'veal', 'veau', 'tea', 'nido', 'formula', 'feta', 'bread', '2go', 'shake', 'protein', 'cream', 'nuti', 'milkshake', 'goat', 'chocolate', 'almond', 'oat', 'coconut', 'soy', 'condensed', 'evaporated', 'powder', 'flavoured', 'lactose'] })],
  cheese: [
    x('cheddar', 'pack', 0.1, 'Dairy & Eggs', ['cheddar', 'cheese'], { lb: 0.9, has: DAIRY, exclude: ['halloum', 'focaccia', 'bread', 'dippers', 'laughing cow', 'violife', 'dairy free', 'samosa', 'samosas', 'swirl', 'cannelloni', 'tortellini', 'bake', 'akawi', 'halloumi', 'paneer', 'brie', 'camembert', 'goat', 'blue', 'burrata', 'bocconcini', 'boursin', 'cream cheese', 'cheesecake', 'puffs', 'crackers', 'string', 'feta', 'ricotta', 'cottage', 'macaroni', 'mac', 'kraft dinner', 'kd', 'cheese sauce', 'cheese dip', 'pizza'] }),
    x('mozzarella', 'pack', 0.1, 'Dairy & Eggs', ['mozzarella'], { lb: 0.75, has: DAIRY, exclude: ['sticks'] }),
    x('feta', 'pack', 0.1, 'Dairy & Eggs', ['feta'], { lb: 0.44, has: DAIRY }),
  ],
  oats: [
    x('oats', 'cup', 0.5, 'Pantry', ['oat'], {exclude: ['milk', 'bar', 'cookie', 'beverage', 'cereal', 'crunchy'], pkg: 10 }),
    x('granola', 'bag', 0.1, 'Pantry', ['granola'], { exclude: ['bar'] }),
  ],
  spread: [x('peanut butter', 'jar', 0.05, 'Pantry', ['peanut butter'], { exclude: ['cookie', 'cups', 'bar'] })],
  dip: [x('hummus', 'tub', 0.2, 'Dairy & Eggs', ['hummus'], {})],
  crackers: [x('crackers', 'box', 0.15, 'Pantry', ['cracker', 'triscuit', 'wheat thins', 'ritz'], { allow: ['cracker'], exclude: ['barrel', 'cheese'], has: GLUTEN })],
  nuts: [x('nuts', 'bag', 0.1, 'Pantry', ['almonds', 'cashews', 'peanuts', 'mixed nuts', 'trail mix', 'walnuts'], { exclude: ['butter', 'milk', 'beverage', 'chocolate'] })],
  cereal: [x('cereal', 'box', 0.1, 'Pantry', ['cereal', 'céréales', 'cheerios', 'corn flakes', 'frosted flakes', 'shreddies', 'mini-wheats', 'special k', 'rice krispies', 'raisin bran', 'honey nut'], { has: GLUTEN, exclude: ['bar', 'baby', 'hot cereal'] })],
  breakfastMeat: [x('bacon', 'pack', 0.15, 'Meat & Seafood', ['bacon'], { lb: 0.8, has: MEAT, exclude: ['bits', 'wrapped', 'bacon-wrapped', 'jam', 'mayo', 'dip'] })],
  lunchProtein: [
    x('deli turkey or ham', 'pack', 0.2, 'Meat & Seafood', ['sliced turkey', 'deli turkey', 'sliced ham', 'deli ham', 'shaved ham', 'shaved turkey'], { lb: 0.4, as: 'turkey & ham', has: MEAT }),
    x('canned tuna', 'can', 0.5, 'Pantry', ['tuna'], { as: 'tuna', has: FISH, exclude: ['steak', 'fillet', 'sushi'] }),
    x('rotisserie chicken', 'each', 0.2, 'Meat & Seafood', ['rotisserie', 'roast chicken', 'bbq chicken'], { lb: 2.5, as: 'chicken', has: MEAT, pkg: 1 }),
  ],
  treats: [
    x('cookies', 'pack', 0.15, 'Snacks', ['cookie', 'biscuit', 'oreo', 'chips ahoy', 'peek freans', "dad's"], { has: GLUTEN, allow: ['chips'], exclude: ['dog', 'cat', 'dough', 'ice cream', 'cereal'] }),
    x('ice cream', 'tub', 0.12, 'Frozen', ['ice cream', 'gelato', 'frozen dessert', 'crème glacée'], { has: DAIRY, allow: ['flavour', 'flavor', 'flavoured', 'flavored'], exclude: ['cone', 'sandwich', 'bar', 'cake', 'cookie'] }),
    x('chocolate', 'bag', 0.15, 'Snacks', ['chocolate chips', 'chocolate bar', 'chocolate', 'chipits'], { allow: ['chips'], exclude: ['milk', 'cookie', 'cereal', 'ice cream', 'almond', 'syrup', 'drink', 'beverage', 'cake', 'protein'] }),
    x('chips', 'bag', 0.2, 'Snacks', ['potato chips', 'tortilla chips', 'chips', 'croustilles', 'doritos', 'tostitos', 'lays', "lay's", 'ruffles'], { allow: ['chips', 'flavour', 'flavor', 'flavoured', 'flavored'], exclude: ['chocolate chips', 'chipits', 'cookie', 'fish', 'chips ahoy'] }),
  ],
  // Shortcuts people actually lean on: boxed dinners, freezer staples, a jar of sauce.
  boxedMeals: [
    x('boxed mac & cheese', 'box', 0.5, 'Pantry', ['kraft dinner', 'kraft mac', 'macaroni & cheese', 'macaroni and cheese', 'mac & cheese', 'mac and cheese', 'macaroni au fromage'], { as: 'mac & cheese', has: [...DAIRY, ...GLUTEN], exclude: ['frozen', 'cheese sauce', 'bites', 'baked', 'vegan', 'véganes'] }),
    x('Hamburger Helper', 'box', 0.25, 'Pantry', ['hamburger helper', 'helper'], { has: [...DAIRY, ...GLUTEN] }),
    x('instant noodles', 'pack', 1, 'Pantry', ['instant noodle', 'mr. noodles', 'mr noodles', 'ramen noodle', 'cup noodles', 'nouilles instantanées', 'nissin'], { as: 'noodles', has: GLUTEN, allow: ['soup', 'flavour', 'flavor', 'flavoured', 'flavored'], exclude: ['soup mix', 'rice noodle'] }),
  ],
  freezerMeals: [
    x('frozen meatballs', 'bag', 0.25, 'Frozen', ['meatball', 'boulettes'], { as: 'meatballs', has: MEAT, exclude: ['sub', 'spaghetti and', 'sauce', 'swedish meatball dinner', 'plant', 'vegetarian', 'ragoût', 'stew'] }),
    x('chicken nuggets', 'bag', 0.25, 'Frozen', ['nugget', 'chicken strips', 'popcorn chicken', 'croquettes de poulet', 'chicken fingers'], { as: 'nuggets', has: MEAT, exclude: ['plant', 'dino'] }),
    x('fish sticks', 'box', 0.25, 'Frozen', ['fish stick', 'fish finger', 'bâtonnets de poisson', 'breaded fish', 'battered fish', 'fish fillets, breaded'], { has: FISH }),
    x('perogies', 'bag', 0.25, 'Frozen', ['perogies', 'perogy', 'pierogi', 'pierogies', 'pyrohy', 'pirojkis'], { has: [...DAIRY, ...GLUTEN] }),
    x('frozen pizza', 'each', 0.5, 'Frozen', ['frozen pizza', 'pizza'], { has: [...DAIRY, ...GLUTEN], exclude: ['sauce', 'dough', 'pâte', 'pocket', 'kit', 'cheese', 'mozzarella', 'crust', 'pizzeria', 'rolls', 'bites', 'pepperoni sticks', 'pops', 'stromboli', 'pizzaiolo'] }),
  ],
  pastaSauce: [x('pasta sauce', 'jar', 0.25, 'Pantry', ['pasta sauce', 'spaghetti sauce', 'marinara', 'sauce pour pâtes', 'sauce à spaghetti', 'classico', 'prego', "rao's", 'tonnelli', 'catelli garden select', 'olivieri'], { allow: ['sauce'], exclude: ['pizza sauce', 'alfredo', 'pesto', 'pasta,', 'pâtes pc,'] })],
  hotDogs: [x('hot dogs', 'pack', 0.25, 'Meat & Seafood', ['hot dog', 'wiener', 'weiner', 'saucisses fumées', 'smokies', 'franks'], { has: MEAT, exclude: ['bun', 'pain', 'relish', 'plant', 'veggie', "frank's", 'wraps', 'wrap', 'cocktail', 'crescents', 'pogo', 'breaded', 'corn dog'] })],
  cannedSoup: [x('canned soup', 'can', 0.5, 'Pantry', ['soup', 'soupe', 'chunky'], { as: 'soup', allow: ['soup'], exclude: ['mix', 'cream of mushroom', 'broth', 'bouillon', 'noodle soup mix', 'cup', 'stock', 'base', 'tamarind'] })],
  cannedTomato: [x('canned tomatoes', 'can', 0.25, 'Pantry', ['canned tomato', 'diced tomato', 'crushed tomato', 'whole tomatoes', 'tomato sauce', 'pasta sauce'], { allow: ['sauce', 'paste'], exclude: ['soup', 'ketchup', 'juice'] })],
}
