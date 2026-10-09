// Data access: Firestore when configured, bundled sample deals + localStorage otherwise.
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { authReady, db, firebaseEnabled } from './firebase'
import { sampleDeals } from '../data/sampleDeals'

export const DEFAULT_PREFS = {
  postalCode: '',
  schedule: null, // { [weekday 0-6]: ['breakfast', 'dinner'] } from Build my week; null = every meal daily
  likes: {}, // { protein: ['chicken'], carb: ['rice'], veg: ['broccoli'] }
  householdSize: 2,
  diet: [],
  stores: [],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'],
  lunchLeftovers: true,
  homeStore: '',
  onboarded: false, // finished the welcome setup / tour
  watch: [], // things always bought ("toilet paper"): shown whenever on sale
  matchAt: '', // the store you price match at ('' = any flyer); see lib/priceMatch.js
  matchExtras: [], // optional flyers that store sometimes accepts (Farm Boy)
}

const PREFS_KEY = 'f2r.prefs'

export function fsa(postalCode) {
  const pc = (postalCode || '').replace(/\s+/g, '').toUpperCase()
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(pc) ? pc.slice(0, 3) : null
}

export async function loadPrefs() {
  if (firebaseEnabled) {
    const user = await authReady
    const snap = await getDoc(doc(db, 'users', user.uid))
    return { ...DEFAULT_PREFS, ...(snap.exists() ? snap.data().prefs : {}) }
  }
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}

export async function savePrefs(prefs) {
  if (firebaseEnabled) {
    const user = await authReady
    await setDoc(doc(db, 'users', user.uid), { prefs }, { merge: true })
  } else {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      /* private mode: preferences just won't persist */
    }
  }
}

// Firestore's free tier allows 50,000 reads a day, and a region has ~1,000 deals, so each phone
// keeps the last copy and re-reads only when it's stale.
const cacheGet = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}
const cacheSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* full or private mode: just read again next time */
  }
}

/** The shared recipe list from Firestore (re-read at most every 12 hours), or null for the bundled copy. */
export async function loadRecipes() {
  if (!firebaseEnabled) return null
  const cached = cacheGet('f2r.recipes')
  if (cached && Date.now() - cached.at < 12 * 3600e3) return cached.list
  await authReady
  const snap = await getDocs(collection(db, 'recipes'))
  const list = snap.empty ? null : snap.docs.map((d) => d.data())
  if (list) cacheSet('f2r.recipes', { at: Date.now(), list })
  return list
}

/** Returns { deals, region } for the household's postal code. Deals are re-read only after a new fetch. */
export async function loadDeals(postalCode) {
  if (!firebaseEnabled) return { deals: sampleDeals(), region: { demo: true } }
  const key = fsa(postalCode)
  if (!key) return { deals: [], region: null }
  await authReady
  const cached = cacheGet('f2r.deals')
  let regionSnap
  try {
    regionSnap = await getDoc(doc(db, 'regions', key))
  } catch (e) {
    if (cached?.key === key) return { deals: cached.deals, region: cached.region }
    throw e
  }
  const region = regionSnap.exists() ? regionSnap.data() : null
  if (cached?.key === key && region && cached.region?.ingestedAt === region.ingestedAt) return { deals: cached.deals, region }
  const dealSnap = await getDocs(collection(db, 'regions', key, 'deals'))
  const deals = dealSnap.docs.map((d) => d.data())
  if (region) cacheSet('f2r.deals', { key, region, deals })
  return { deals, region }
}

// Per-household week edits (swapped ingredients, other ideas, skipped meals, ticked list items).
// Device-local on purpose:
// it's scratch state for this week, and resets after 7 days.
const WEEK_KEY = 'f2r.week'
export const EMPTY_WEEK = { overrides: {}, avoid: [], checked: {}, extras: [], needs: [] }

export function loadWeek(todayKey) {
  try {
    const w = JSON.parse(localStorage.getItem(WEEK_KEY) || 'null')
    if (w && w.started && w.overrides && (Date.parse(todayKey) - Date.parse(w.started)) / 864e5 < 7) return { ...EMPTY_WEEK, ...w }
  } catch {
    /* fall through */
  }
  return { ...EMPTY_WEEK, started: todayKey }
}

export function saveWeek(week) {
  try {
    localStorage.setItem(WEEK_KEY, JSON.stringify(week))
  } catch {
    /* private mode */
  }
}
