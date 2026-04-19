#!/usr/bin/env node
/**
 * Import mock data to Firebase Firestore using Firebase Admin SDK
 * 
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
 *   node scripts/import-to-firestore.js
 * 
 * Or with Firebase emulator:
 *   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
 *   FIRESTORE_EMULATOR_HOST=localhost:8080
 *   node scripts/import-to-firestore.js --emulator
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const useEmulator = args.includes('--emulator');

// Initialize Firebase
if (useEmulator) {
  console.log('🔧 Using Firebase Emulator');
  initializeApp({
    projectId: 'finventory-1776558252'
  });
} else {
  // Try to use application default credentials
  try {
    initializeApp();
    console.log('✅ Firebase initialized with default credentials');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    console.log('\nTo fix this:');
    console.log('  1. Set GOOGLE_APPLICATION_CREDENTIALS env var:');
    console.log('     export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json');
    console.log('  2. Or run with --emulator flag for local testing');
    process.exit(1);
  }
}

const db = getFirestore();

async function importData() {
  const dataPath = path.join(__dirname, 'mock-data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ mock-data.json not found. Run generate-mock-data.py first.');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  console.log('\n📥 Importing data to Firestore...\n');
  
  // Import users
  console.log('👤 Importing users...');
  const usersBatch = db.batch();
  for (const user of data.users) {
    const ref = db.collection('users').doc(user.id);
    usersBatch.set(ref, {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date()
    });
  }
  await usersBatch.commit();
  console.log(`   ✅ ${data.users.length} users imported`);
  
  // Import listings
  console.log('📦 Importing listings...');
  // Use batches of 500 (Firestore limit)
  const listingChunks = chunkArray(data.listings, 500);
  for (const chunk of listingChunks) {
    const batch = db.batch();
    for (const listing of chunk) {
      const ref = db.collection('listings').doc(listing.id);
      batch.set(ref, {
        ...listing,
        createdAt: new Date(listing.createdAt),
        expiresAt: new Date(listing.expiresAt),
        freshnessDate: new Date(listing.freshnessDate),
        catchDate: new Date(listing.catchDate),
        landingDate: new Date(listing.landingDate),
        updatedAt: new Date()
      });
    }
    await batch.commit();
  }
  console.log(`   ✅ ${data.listings.length} listings imported`);
  
  // Import orders
  console.log('🛒 Importing orders...');
  const orderChunks = chunkArray(data.orders, 500);
  for (const chunk of orderChunks) {
    const batch = db.batch();
    for (const order of chunk) {
      const ref = db.collection('orders').doc(order.id);
      const orderData = {
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date()
      };
      if (order.pickupTime) orderData.pickupTime = new Date(order.pickupTime);
      if (order.pickedUpAt) orderData.pickedUpAt = new Date(order.pickedUpAt);
      batch.set(ref, orderData);
    }
    await batch.commit();
  }
  console.log(`   ✅ ${data.orders.length} orders imported`);
  
  // Import standing orders
  console.log('🔄 Importing standing orders...');
  const soBatch = db.batch();
  for (const so of data.standingOrders) {
    const ref = db.collection('standingOrders').doc(so.id);
    soBatch.set(ref, {
      ...so,
      createdAt: new Date(so.createdAt),
      updatedAt: new Date()
    });
  }
  await soBatch.commit();
  console.log(`   ✅ ${data.standingOrders.length} standing orders imported`);
  
  console.log('\n🎉 All data imported successfully!\n');
  process.exit(0);
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

importData().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
