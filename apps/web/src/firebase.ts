import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth'
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

const isValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId

let app: FirebaseApp | undefined
let auth: Auth | undefined  
let db: Firestore | undefined

if (isValidConfig) {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    
    // Connect to Firebase Auth Emulator in development
    if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
      console.log('[Firebase] Using Auth Emulator at localhost:9099')
    }
  } catch (err) {
    console.error('Firebase init error:', err)
  }
} else {
  console.warn('Firebase config missing - auth/database unavailable')
}

export { auth, db }
export default app
