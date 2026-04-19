import * as admin from 'firebase-admin';
// Cloud Functions auto-initializes admin in production
// Explicitly initialize for local development/testing
// Check prevents double-initialization errors
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://finventory-default-rtdb.firebaseio.com'
    });
}
export const db = admin.firestore();
export const rtdb = admin.database();
export const auth = admin.auth();
export const storage = admin.storage();
