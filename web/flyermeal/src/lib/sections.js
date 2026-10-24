// Which part of the store a list item is in, so the list reads in the order you walk a Canadian
// grocery store. Words are matched whole; the last word we know wins ("chicken broth" is
// broth, "garlic bread" is bread), and phrases beat single words ("peanut butter", "black pepper").

export const SECTIONS = [
  { id: 'produce', label: 'Produce', emoji: '🥬' },
  { id: 'meat', label: 'Meat & seafood', emoji: '🥩' },
  { id: 'deli', label: 'Deli', emoji: '🥪' },
  { id: 'dairy', label: 'Dairy & eggs', emoji: '🧀' },
  { id: 'bakery', label: 'Bakery', emoji: '🍞' },
  { id: 'pantry', label: 'Pantry', emoji: '🥫' },
  { id: 'baking', label: 'Baking & spices', emoji: '🧂' },
  { id: 'snacks', label: 'Snacks & drinks', emoji: '🍿' },
  { id: 'frozen', label: 'Frozen', emoji: '🧊' },
  { id: 'household', label: 'Household', emoji: '🧻' },
  { id: 'personal', label: 'Personal care', emoji: '🧴' },
  { id: 'other', label: 'Other', emoji: '🛒' },
]

const WORDS = {
  produce: `chillies garlic-clove garlic-cloves coriander coriander-leaves peas snow-peas snap-peas sugar-snap-peas green-beans corn sweetcorn pak-choi bok-choy swede celeriac rocket galangal chestnuts cassava horseradish coleslaw vegetable vegetables veggies stir-fry egg-plant egg-plants scotch-bonnet salad-kit fruit potatoe apple apricot artichoke arugula asparagus avocado banana basil bean-sprout beet beetroot blackberry blueberry bok-choy
    broccoli broccolini brussels cabbage cantaloupe carrot cauliflower celery chard cherry chive cilantro clementine coleslaw-mix
    corn-on-the-cob cranberry cucumber date dill eggplant aubergine endive fennel fig garlic ginger grape grapefruit herb honeydew
    jalapeno kale kiwi leek lemon lemongrass lettuce lime mandarin mango melon mint mushroom nectarine okra onion orange parsley
    parsnip peach pear pepper persimmon pineapple plantain plum pomegranate potato pumpkin radish raspberry rhubarb romaine rosemary
    rutabaga sage salad scallion shallot spinach sprout squash strawberry thyme tomato turnip watermelon yam zucchini courgette
    berry berries greens microgreens chili chilli`,
  meat: `black-pudding lard suet beef steak brisket chuck sirloin ribeye roast mince chicken breast thigh drumstick wing wings pork chop chops tenderloin loin rib ribs
    bacon sausage sausages bratwurst chorizo ham hock lamb veal turkey duck goose venison bison meatball meatballs patty patties burger burgers
    fish salmon tilapia cod haddock halibut trout tuna-steak mahi sole pollock shrimp prawn prawns scallop scallops lobster crab mussel mussels
    clam clams oyster oysters squid calamari seafood fillet fillets kielbasa wiener wieners hot-dog hot-dogs oxtail liver`,
  deli: `deli-turkey deli-meat deli-ham parma-ham smoked-salmon jamon olives-deli falafel salami pepperoni prosciutto pastrami bologna deli hummus rotisserie-chicken pate smoked-meat sliced-turkey sliced-ham`,
  dairy: `creme-fraiche fromage-frais gruyere ghee custard coconut-yogurt soured-cream sour-cream-dip dip milk cream half-and-half buttermilk butter margarine cheese cheddar mozzarella parmesan parmigiano pecorino ricotta feta brie
    gouda swiss provolone mascarpone cottage-cheese cream-cheese yogurt yoghurt kefir egg eggs sour-cream whipping-cream creamer
    oat-milk almond-milk soy-milk paneer halloumi tofu tempeh hollandaise`,
  bakery: `toast wonton-wrappers egg-roll-wrappers pie-crusts bread loaf baguette bun buns roll rolls bagel bagels croissant croissants muffin muffins english-muffin pita naan tortilla tortillas
    wrap wraps flatbread ciabatta brioche sourdough cake donut doughnut doughnuts pie-shell pie-crust pastry danish focaccia`,
  pantry: `kraft-dinner mac-and-cheese hotsauce aioli tomato-puree chopped-tomatoes tinned-tomatoes tinned-tomatos canned-tomatoes dried-apricots coconut-cream water-chestnut cooking-wine shrimp-paste tahini tamarind gochujang doubanjiang applesauce creamed-corn dal split-peas grain tapioca fusilli farfalle croutons sultanas dulce-de-leche caramel lemon-juice lime-juice anchovy anchovies sauerkraut mirin rice-cakes pasta spaghetti penne linguine fettuccine macaroni rigatoni ziti lasagna lasagne noodle noodles orzo shells couscous rice quinoa
    oats oatmeal cereal granola bean beans chickpea chickpeas lentil lentils canned can tin soup broth stock bouillon sauce salsa ketchup
    mustard mayonnaise mayo relish vinegar oil olive-oil vegetable-oil canola-oil peanut-butter jam jelly honey syrup maple-syrup
    nutella tomato-sauce tomato-paste crushed-tomatoes diced-tomatoes passata pasta-sauce gravy dressing tuna sardines salmon-canned
    coconut-milk soy-sauce teriyaki sriracha hot-sauce bbq-sauce worcestershire olives pickles capers breadcrumbs panko crackers
    taco-shells taco-seasoning curry-paste gnocchi ramen stuffing salad-dressing peanut peanuts almonds walnuts pecans
    cashews nuts raisins seeds chia hemp dried`,
  baking: `cloves treacle cacao marzipan ground-clove ground-cloves cayenne-pepper chilli-powder chili-flakes chilli-flakes red-chilli-flakes ground-ginger sichuan-pepper szechuan-peppercorns potato-starch cumin-seeds fennel-seeds ground-coriander bay-leaf garam-masala molasses cardamom star-anise saffron marjoram tarragon cajun bicarbonate-of-soda custard-powder gelatine desiccated-coconut marshmallows sprinkles icing chocolate-bar baking-chocolate flour sugar brown-sugar icing-sugar baking-soda baking-powder yeast cornstarch cornmeal vanilla vanilla-extract cocoa chocolate-chips
    salt black-pepper red-pepper-flakes pepper-flakes cinnamon nutmeg paprika cumin oregano dried-oregano dried-basil italian-seasoning
    chili-powder garlic-powder onion-powder cayenne turmeric curry-powder bay-leaves spice spices seasoning thyme-dried shortening
    sprinkles extract gelatin allspice`,
  snacks: `tortilla-chips sherry brandy vodka sake rum whisky cider digestive-biscuits biscuits chips crisps popcorn pretzels cookies cookie candy chocolate granola-bars bars juice pop soda coffee tea water sparkling-water
    beer wine kombucha energy-drink sports-drink gum`,
  frozen: `waffles frozen ice-cream popsicle popsicles pizza fries waffles-frozen frozen-peas frozen-vegetables frozen-fruit ice`,
  household: `sandwich-bags freezer-bags bags paper-towel paper-towels toilet-paper tissue tissues napkins dish-soap dishwasher detergent laundry bleach cleaner wipes garbage-bags
    trash-bags foil aluminum-foil plastic-wrap parchment ziploc sponge sponges batteries light-bulbs fabric-softener dryer-sheets
    pet-food dog-food cat-food cat-litter litter charcoal`,
  personal: `shampoo conditioner soap body-wash toothpaste toothbrush deodorant razor razors lotion sunscreen diapers wipes-baby floss mouthwash
    vitamins tampons pads cotton`,
}

const LONGEST = 3 // words in the longest phrase above

const fold = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const singular = (w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && /(ch|sh|x|o)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)

const LOOKUP = new Map()
for (const [id, list] of Object.entries(WORDS))
  for (const raw of list.split(/\s+/).filter(Boolean)) {
    const words = raw.split('-')
    LOOKUP.set(words.map(singular).join(' '), id)
  }

const memo = new Map()

// `fallback` is the flyer's own aisle for the matched deal, used when the words don't say.
export function sectionFor(name, fallback) {
  const key = fold(name)
  if (memo.has(key)) return memo.get(key) ?? FROM_AISLE[fallback] ?? 'other'
  const words = key.replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(Boolean).map(singular)
  let found = null
  if (words.includes('frozen')) found = 'frozen'
  // From the end of the name (the last thing named is what it is: "hot dog buns" are buns), the
  // longest phrase ending at each word.
  for (let end = words.length; end > 0 && !found; end--)
    for (let n = Math.min(LONGEST, end); n >= 1 && !found; n--) found = LOOKUP.get(words.slice(end - n, end).join(' ')) ?? null
  memo.set(key, found)
  return found ?? FROM_AISLE[fallback] ?? 'other'
}

const FROM_AISLE = {
  Produce: 'produce',
  'Meat & Seafood': 'meat',
  'Dairy & Eggs': 'dairy',
  Bakery: 'bakery',
  Frozen: 'frozen',
  Pantry: 'pantry',
  Snacks: 'snacks',
  'Plant Protein': 'dairy',
}

// Lines grouped by section in store order; checked items sink to the bottom of their section.
export function bySection(lines) {
  const groups = new Map(SECTIONS.map((s) => [s.id, []]))
  // `section` is set when you've moved an item yourself.
  for (const l of lines) groups.get(groups.has(l.section) ? l.section : sectionFor(l.name, l.deal?.aisle)).push(l)
  return SECTIONS.map((s) => ({ ...s, lines: groups.get(s.id).sort((a, b) => !!a.checked - !!b.checked) })).filter((s) => s.lines.length)
}
