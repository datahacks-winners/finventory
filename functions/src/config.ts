import admin from 'firebase-admin'

// Initialize Firebase Admin
admin.initializeApp()

export const db = admin.firestore()
export const auth = admin.auth()
export const storage = admin.storage()
export const FieldValue = admin.firestore.FieldValue

// Backwards compatibility - lazy rtdb
let _rtdb: admin.database.Database | null = null
export const rtdb = (): admin.database.Database => {
  if (!_rtdb) {
    _rtdb = admin.database()
  }
  return _rtdb
}