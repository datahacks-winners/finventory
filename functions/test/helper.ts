import admin from 'firebase-admin';
import * as firebase from '@firebase/rules-unit-testing';

const PROJECT_ID = 'finventory-func-test';

let adminApp: admin.app.App | null = null;

export async function setupTestEnv(): Promise<firebase.RulesTestEnvironment> {
  const testEnv = await firebase.initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: 'localhost',
      port: 8080,
    },
  });

  // Initialize admin app for tests to use emulator
  if (!admin.apps || admin.apps.length === 0) {
    const settings = {
      projectId: PROJECT_ID,
    };
    adminApp = admin.initializeApp(settings);
  } else {
    adminApp = admin.app();
  }

  return testEnv;
}

export async function cleanupTestEnv(testEnv: firebase.RulesTestEnvironment): Promise<void> {
  if (adminApp) {
    try {
      await adminApp.delete();
    } catch {
      // Ignore deletion errors
    }
    adminApp = null;
  }
  try {
    await testEnv.cleanup();
  } catch {
    // Ignore cleanup errors
  }
}

export async function clearFirestore(testEnv: firebase.RulesTestEnvironment): Promise<void> {
  await testEnv.clearFirestore();
}

export function getAdminFirestore(): admin.firestore.Firestore {
  if (!adminApp) {
    throw new Error('Admin app not initialized. Call setupTestEnv first.');
  }
  return adminApp.firestore();
}
