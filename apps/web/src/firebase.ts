import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// TODO: Replace with your Firebase config from console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Only initialize Firebase if all required config is present
const isValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

if (isValidConfig) {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    console.log('Firebase initialized successfully')
  } catch (err) {
    console.error('Failed to initialize Firebase:', err)
    // Keep exports as null
  }
} else {
  console.warn('Firebase config missing - Firebase services unavailable')
}

export { auth, db }
export default app
