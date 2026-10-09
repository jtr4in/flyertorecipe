import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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
  db = getFirestore(app)
  const auth = getAuth(app)
  // Anonymous auth gives each household a uid for its preferences without a sign-up form.
  // Upgrade to Google/email sign-in later with linkWithCredential to keep the same uid.
  authReady = signInAnonymously(auth).then((cred) => cred.user)
}

export { db, authReady }
