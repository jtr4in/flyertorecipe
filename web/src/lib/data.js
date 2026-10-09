// Data access: Firestore when configured, bundled sample deals + localStorage otherwise.
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { authReady, db, firebaseEnabled } from './firebase'
import { sampleDeals } from '../data/sampleDeals'

export const DEFAULT_PREFS = {
  postalCode: '',
  householdSize: 2,
  mealsPerWeek: 5,
  diet: [],
  stores: [],
  priceMatch: false,
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

/** Returns { deals, region } for the household's postal code. */
export async function loadDeals(postalCode) {
  if (!firebaseEnabled) return { deals: sampleDeals(), region: { demo: true } }
  const key = fsa(postalCode)
  if (!key) return { deals: [], region: null }
  await authReady
  const [regionSnap, dealSnap] = await Promise.all([
    getDoc(doc(db, 'regions', key)),
    getDocs(collection(db, 'regions', key, 'deals')),
  ])
  return {
    deals: dealSnap.docs.map((d) => d.data()),
    region: regionSnap.exists() ? regionSnap.data() : null,
  }
}
