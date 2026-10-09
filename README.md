# Flyer2Recipes

A smart grocery deal and meal planner for Canadian households. A weekly Python job pulls flyer
deals from Apify into Firestore; a mobile-first React app turns the deals near you into a dinner
plan and an aisle-ordered shopping list with estimated savings.

```
backend/   Python ingestion: Apify actor -> normalize -> Firestore
web/       React 19 + Tailwind 4 + Vite, Firebase web SDK
firestore.rules, firebase.json   Firestore security rules + Hosting config
.github/workflows/ingest.yml     Weekly scheduled ingest (Thursdays)
```

## How it works

1. `backend/ingest.py` calls the Apify actor `gratifying_graph/canada-grocery-deals` with a postal
   code and ~32 staple search terms (`backend/staples.py`), normalizes each row
   (`backend/normalize.py`: per-item price for multi-buys like `2/$5`, savings, aisle), dedupes,
   and writes `regions/{FSA}/deals/{dealId}`. Deals that dropped off the flyer are deleted.
2. The web app signs each household in anonymously, stores preferences at `users/{uid}`, and
   reads the deals for the household's FSA (first three characters of the postal code).
3. `web/src/lib/planner.js` builds meals flyer-first. Meal templates (`web/src/data/templates.js`,
   e.g. "Sheet-pan {protein} with {veg} & {starch}") have slots that draw from ingredient groups
   (`web/src/data/ingredients.js`); each slot is filled with whatever in the group is on sale this
   week, so nearly every ingredient comes from a flyer. The week avoids repeat dinners, reuses
   ingredients already on the list, and scales to household size.

## The app

- **Your week:** tap a day to see its breakfast, lunch, dinner and snack, each built from sale
  items with the store and flyer price on every ingredient. Tap ⇄ to swap an ingredient for
  something else on sale, "Another idea" for a different dish, or Skip. Lunch can be last
  night's leftovers (dinner cooks double). Which meals to plan is set in Household settings.
- **What's the plan?** box: keywords like "quick", "high protein", "kids", "meal prep" or
  "under $80" turn into filters and a week budget (with a progress bar). Filter chips do the same.
- **Grocery list:** grouped by aisle, with two tabs. *Price Matching* lists every item at its
  lowest flyer price from any store, and "View all flyers" opens one scrollable page of every
  flyer ad to show the cashier. *One Store* uses only the chosen store's deals. Hover (or tap) an
  item to see its flyer ad.

Costs are estimates: flyers rarely state package sizes, and items not on sale use typical prices.

## Run it

**Web app (works with no credentials; uses bundled demo deals):**

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # planner tests
```

To use real data, copy `web/.env.example` to `web/.env` and fill in your Firebase web config.

**Ingestion:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # add APIFY_TOKEN, service-account path, POSTAL_CODES
python -m pytest -q
python ingest.py --dry-run deals.json   # fetch + normalize, no Firestore write
python ingest.py                        # write to Firestore
```

**Firebase setup:** create a project, enable Firestore and Anonymous sign-in
(Authentication > Sign-in method), then `firebase deploy --only firestore:rules`.
`npm run build` in `web/` and `firebase deploy --only hosting` publishes the app.

## Cost

The actor bills per deal returned ($0.002/deal from 2026-10-08, plus $0.0005 per run).
32 terms x `MAX_ITEMS_PER_QUERY=20` caps a run at 640 deals, about $1.30 per postal area per week.
`MAX_CHARGE_USD` sets a hard cap per run.

## Known limits / next steps

- **Coverage is per ingested area.** Only FSAs listed in `POSTAL_CODES` have deals. Neighbouring
  FSAs can share one fetch: `K1E 0A1:K1C,K1W,K4A` stores the same deals for all four. On-demand
  ingest for a new postal code needs a Cloud Function (Blaze plan) that runs the same code.
- **Savings are estimates.** Many flyer rows have no regular price; those show no savings.
  Savings assume one pack per list line.
- **Matching is keyword based.** Each catalog ingredient lists flyer words to match and words to
  exclude. Tune `ingredients.js` as real flyer names come in.
- **LLM upgrade:** swap `planWeek` for a call that sends the active deals + preferences to an LLM
  (from a Cloud Function, never the browser) to generate recipes beyond the seed set.
