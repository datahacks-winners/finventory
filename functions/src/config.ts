import admin from 'firebase-admin'

// Cloud Functions auto-initializes admin in production
// Explicitly initialize for local development/testing
// Check prevents double-initialization errors
try {
  if (!admin.apps || !admin.apps.length) {
    const databaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://finventory-default-rtdb.firebaseio.com'
    const config: admin.AppOptions = {
      credential: admin.credential.applicationDefault(),
      databaseURL: databaseUrl
    }
    admin.initializeApp(config)
  }
} catch (e) {
  // Admin may already be initialized or in test environment
  console.log('Firebase admin initialization skipped:', e)
}

export const db = admin.firestore()

// Lazy rtdb - only initialize when actually accessed
let _rtdb: admin.database.Database | null = null
export const rtdb = (): admin.database.Database => {
  if (!_rtdb) {
    _rtdb = admin.database()
  }
  return _rtdb
}

export const auth = admin.auth()
export const storage = admin.storage()