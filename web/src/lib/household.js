// A shared household: one Firestore doc holding the week's plan inputs (household settings,
// meal changes, filters) and the grocery list checkmarks, so everyone with the link sees the
// same plan and list, live. The link is the key: households/{id} with a long random id.
import { doc, FieldPath, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { authReady, db } from './firebase'

const KEY = 'f2r.household'

// Per-person settings that stay on each phone.
const PERSONAL = ['onboarded']
export const sharedPrefs = (prefs) => Object.fromEntries(Object.entries(prefs).filter(([k]) => !PERSONAL.includes(k)))

/** The household this phone belongs to: from a ?h= link (remembered), else the saved one. */
export function currentHousehold() {
  try {
    const url = new URL(window.location.href)
    const fromLink = url.searchParams.get('h')
    if (fromLink && /^[a-z0-9]{12,40}$/.test(fromLink)) {
      localStorage.setItem(KEY, fromLink)
      url.searchParams.delete('h')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
      return fromLink
    }
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function leaveHousehold() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
}

export const householdLink = (id) => `${window.location.origin}${window.location.pathname}?h=${id}`

const ref = (id) => doc(db, 'households', id)

/** Start sharing: a new household seeded with this phone's plan. */
export async function createHousehold(state) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const id = [...bytes].map((b) => (b % 36).toString(36)).join('') + Date.now().toString(36)
  await authReady
  await setDoc(ref(id), { ...state, updatedAt: serverTimestamp() })
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* the link still works; this phone just won't remember it */
  }
  return id
}

/** Live updates; returns an unsubscribe function. */
export function watchHousehold(id, onData, onError) {
  let unsub = () => {}
  let stopped = false
  authReady.then(() => {
    if (!stopped) unsub = onSnapshot(ref(id), (snap) => onData(snap.exists() ? snap.data() : null), onError)
  })
  return () => {
    stopped = true
    unsub()
  }
}

/** Write some top-level fields ({ prefs }, { week }, { chips, query }). */
export async function saveHousehold(id, fields) {
  await authReady
  await updateDoc(ref(id), { ...fields, updatedAt: serverTimestamp() })
}

/** One checkmark, written on its own so two people ticking at once don't overwrite each other. */
export async function setHouseholdCheck(id, key, value) {
  await authReady
  await updateDoc(ref(id), new FieldPath('week', 'checked', key), value, 'updatedAt', serverTimestamp())
}

/** Every week field except the checkmarks, which go one at a time. */
export async function saveHouseholdWeek(id, week) {
  await authReady
  const fields = Object.fromEntries(Object.entries(week).filter(([k]) => k !== 'checked').map(([k, v]) => [`week.${k}`, v]))
  await updateDoc(ref(id), { ...fields, updatedAt: serverTimestamp() })
}
