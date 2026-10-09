import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

let db = null
let authReady = null

if (firebaseEnabled) {
  const app = initializeApp(config)
  db = initializeFirestore(app, { ignoreUndefinedProperties: true })
  const auth = getAuth(app)
  // Local testing against the Firebase emulators (VITE_FIREBASE_EMULATOR=1).
  if (import.meta.env.VITE_FIREBASE_EMULATOR) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  }
  // Anonymous auth gives each household a uid for its preferences without a sign-up form.
  // Upgrade to Google/email sign-in later with linkWithCredential to keep the same uid.
  authReady = signInAnonymously(auth).then((cred) => cred.user)
}

export { db, authReady }
