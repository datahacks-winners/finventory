import * as admin from 'firebase-admin'

// Initialize Firebase Admin - works in both emulator and production
if (!admin.apps.length) {
  admin.initializeApp()
}

export const db = admin.firestore()
export const auth = admin.auth()
export const storage = admin.storage()

// Backwards compatibility - lazy rtdb
let _rtdb: admin.database.Database | null = null
export const rtdb = (): admin.database.Database => {
  if (!_rtdb) {
    _rtdb = admin.database()
  }
  return _rtdb
}