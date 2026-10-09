// Made-up demo deals in the same shape backend/ingest.py writes to Firestore.
// Used only when no Firebase config is set, so the UI works out of the box.
const rows = [
  // name, merchant, price, regularPrice, aisle, priceText
  ['Boneless Skinless Chicken Breast', 'No Frills', 8.99, 13.99, 'Meat & Seafood', '$8.99/lb'],
  ['Chicken Thighs Family Pack', 'FreshCo', 4.44, 6.99, 'Meat & Seafood', '$4.44/lb'],
  ['Extra Lean Ground Beef', 'Metro', 5.99, 8.49, 'Meat & Seafood', '$5.99/lb'],
  ['Pork Loin Centre Cut Chops', 'Food Basics', 2.99, 4.99, 'Meat & Seafood', '$2.99/lb'],
  ['Atlantic Salmon Fillets', 'Loblaws', 10.99, 14.99, 'Meat & Seafood', '$10.99/lb'],
  ['Raw Shrimp 31-40, 340 g', 'Walmart', 7.97, null, 'Meat & Seafood', '$7.97'],
  ['Mild Italian Sausage', 'No Frills', 4.49, 5.99, 'Meat & Seafood', '$4.49'],
  ['Large Eggs, 12 pk', 'Walmart', 3.47, 4.29, 'Dairy & Eggs', '$3.47'],
  ['2% Milk, 4 L', 'FreshCo', 5.49, 6.29, 'Dairy & Eggs', '$5.49'],
  ['Medium Cheddar Cheese, 400 g', 'Metro', 5.0, 7.99, 'Dairy & Eggs', '2/$10'],
  ['Greek Yogurt 650 g', 'Loblaws', 4.99, 6.49, 'Dairy & Eggs', '$4.99'],
  ['Salted Butter 454 g', 'No Frills', 4.99, null, 'Dairy & Eggs', '$4.99'],
  ['Russet Potatoes 10 lb', 'FreshCo', 3.99, 6.99, 'Produce', '$3.99'],
  ['Yellow Onions 3 lb', 'No Frills', 1.99, 2.99, 'Produce', '$1.99'],
  ['Carrots 2 lb', 'Food Basics', 1.49, 2.49, 'Produce', '$1.49'],
  ['Broccoli Crowns', 'Metro', 1.99, 3.49, 'Produce', '$1.99/lb'],
  ['Sweet Red Peppers', 'No Frills', 0.99, 1.99, 'Produce', '$0.99 ea'],
  ['Roma Tomatoes', 'Walmart', 1.27, null, 'Produce', '$1.27/lb'],
  ['Baby Spinach 312 g', 'Loblaws', 3.99, 5.49, 'Produce', '$3.99'],
  ['Romaine Hearts 3 pk', 'FreshCo', 2.99, 4.49, 'Produce', '$2.99'],
  ['Gala Apples 3 lb bag', 'Food Basics', 3.99, 5.99, 'Produce', '$3.99'],
  ['Strawberries 1 lb', 'Metro', 2.99, 4.99, 'Produce', '$2.99'],
  ['Long Grain White Rice 8 kg', 'Walmart', 13.97, 17.97, 'Pantry', '$13.97'],
  ['Spaghetti or Penne Pasta 900 g', 'No Frills', 1.5, 2.49, 'Pantry', '2/$3'],
  ['Black Beans 540 mL Canned', 'FreshCo', 1.0, 1.79, 'Pantry', '$1.00'],
  ['Red Split Lentils 900 g', 'Loblaws', 3.49, 4.79, 'Pantry', '$3.49'],
  ['Diced Tomatoes 796 mL', 'Metro', 1.25, 2.29, 'Pantry', '4/$5'],
  ['Large Flake Oats 1 kg', 'Food Basics', 2.99, 3.99, 'Pantry', '$2.99'],
  ['Smooth Peanut Butter 1 kg', 'Walmart', 4.97, 6.47, 'Pantry', '$4.97'],
  ['Chickpeas 540 mL', 'No Frills', 0.99, 1.49, 'Pantry', '$0.99'],
  ['Flour Tortillas 10 pk', 'FreshCo', 2.99, 4.29, 'Bakery', '$2.99'],
  ['Whole Wheat Bread 675 g', 'Food Basics', 2.5, 3.49, 'Bakery', '$2.50'],
  ['Hamburger Buns 8 pk', 'Metro', 2.49, 3.99, 'Bakery', '$2.49'],
  ['Frozen Mixed Vegetables 1 kg', 'No Frills', 2.99, 4.49, 'Frozen', '$2.99'],
  ['Extra Firm Tofu 350 g', 'Loblaws', 2.49, 3.29, 'Plant Protein', '$2.49'],
  ['Chicken Noodle Soup', 'Walmart', 0.98, null, 'Pantry', '$0.98'],
  ['Chicken Flavour Seasoning Mix', 'Metro', 1.49, 2.29, 'Pantry', '$1.49'],
]

export function sampleDeals(today = new Date()) {
  const day = (n) => new Date(today.getTime() + n * 864e5).toISOString().slice(0, 10)
  return rows.map(([name, merchant, price, regularPrice, aisle, priceText], idx) => ({
    dealId: `demo-${idx}`,
    name,
    merchant,
    price,
    regularPrice,
    savings: regularPrice ? Math.round((regularPrice - price) * 100) / 100 : null,
    aisle,
    priceText,
    validFrom: day(-2),
    validTo: day(5),
  }))
}
