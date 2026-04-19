#!/usr/bin/env node
// Upload CSV data to Firestore using Firebase Admin SDK
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const PROJECT_ID = 'finventory-1776558252';

function parsePhotos(photosStr) {
  if (!photosStr || photosStr === '[]') return [];
  try {
    return JSON.parse(photosStr.replace(/""/g, '"'));
  } catch {
    return [];
  }
}

function toTimestamp(isoStr) {
  if (!isoStr) return null;
  try {
    const date = new Date(isoStr);
    return Timestamp.fromDate(date);
  } catch {
    return null;
  }
}

function transformListing(row) {
  const data = {
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    species: row.species,
    grade: row.grade.toLowerCase() === 'a' ? 'gradeA' : row.grade.toLowerCase() === 'b' ? 'gradeB' : row.grade.toLowerCase(),
    title: row.title,
    quantity: parseInt(row.quantity, 10) || 0,
    unit: row.unit,
    pricePerUnit: parseFloat(row.price_per_unit) || 0,
    freshnessDate: toTimestamp(row.freshness_date),
    expiresAt: toTimestamp(row.expires_at),
    location: {
      latitude: parseFloat(row.location_latitude) || 0,
      longitude: parseFloat(row.location_longitude) || 0,
      address: row.location_address
    },
    deliveryAvailable: row.delivery_available === '1',
    status: row.status,
    photos: parsePhotos(row.photos),
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };

  if (row.delivery_fee) {
    const fee = parseInt(row.delivery_fee, 10);
    if (!isNaN(fee)) data.deliveryFee = fee;
  }

  if (row.sushi_cert_number) {
    data.sushiCertNumber = row.sushi_cert_number;
    data.sushiCertExpiry = toTimestamp(row.sushi_cert_expiry);
    data.isSushiGrade = true;
  }

  return data;
}

function transformUser(row) {
  const data = {
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url,
    phoneNumber: row.phone_number,
    isVendor: row.is_vendor === '1',
    isBuyer: row.is_buyer === '1',
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };

  if (row.business_name) {
    data.businessName = row.business_name;
    data.businessAddress = {
      street: row.business_address_street || '',
      city: row.business_address_city || '',
      state: row.business_address_state || '',
      zip: row.business_address_zip || '',
      lat: parseFloat(row.business_address_lat) || 0,
      lng: parseFloat(row.business_address_lng) || 0
    };
  }

  if (row.rating) {
    data.rating = parseFloat(row.rating);
  }

  if (row.total_sales) {
    data.totalSales = parseInt(row.total_sales, 10) || 0;
  }

  if (row.saved_payment_methods) {
    try {
      data.savedPaymentMethods = JSON.parse(row.saved_payment_methods);
    } catch {}
  }

  if (row.standing_orders) {
    try {
      data.standingOrders = JSON.parse(row.standing_orders);
    } catch {}
  }

  return data;
}

function readCSV(filepath) {
  const content = readFileSync(filepath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true
  });
}

async function uploadData(dryRun = false) {
  console.log('\n' + '='.repeat(60));
  console.log('Uploading CSV Data to Firestore');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPLOAD'}`);
  console.log('='.repeat(60) + '\n');

  // Read CSV files
  console.log('1. Reading CSV files...');
  const listings = readCSV('/tmp/listings.csv');
  const users = readCSV('/tmp/users.csv');
  console.log(`   - ${listings.length} listings`);
  console.log(`   - ${users.length} users\n`);

  if (dryRun) {
    console.log('DRY RUN - Sample transformations:');
    console.log('User sample:', JSON.stringify(transformUser(users[0]), null, 2).slice(0, 500));
    console.log('Listing sample:', JSON.stringify(transformListing(listings[0]), null, 2).slice(0, 500));
    return;
  }

  // Initialize Firebase Admin with ADC
  console.log('2. Initializing Firebase Admin...');
  const app = initializeApp({
    projectId: PROJECT_ID
  });
  const db = getFirestore(app);

  // Upload users first
  console.log('\n3. Uploading users...');
  let userCount = 0;
  for (const row of users) {
    const data = transformUser(row);
    await db.collection('users').doc(row.uid).set(data, { merge: true });
    userCount++;
    if (userCount % 10 === 0) {
      process.stdout.write(`\r   Progress: ${userCount}/${users.length}`);
    }
  }
  console.log(`\r   ✓ Uploaded ${userCount}/${users.length} users`);

  // Upload listings
  console.log('\n4. Uploading listings...');
  let listingCount = 0;
  let activeCount = 0;
  for (const row of listings) {
    const data = transformListing(row);
    if (row.status === 'active') activeCount++;
    await db.collection('listings').doc(row.id).set(data, { merge: true });
    listingCount++;
    if (listingCount % 50 === 0) {
      process.stdout.write(`\r   Progress: ${listingCount}/${listings.length}`);
    }
  }
  console.log(`\r   ✓ Uploaded ${listingCount}/${listings.length} listings`);
  console.log(`   - ${activeCount} active listings will appear in marketplace`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Upload complete!');
  console.log('\nNext steps:');
  console.log('1. Deploy Firestore indexes:');
  console.log('   firebase deploy --only firestore:indexes');
  console.log('2. Hard refresh the web app (Ctrl+Shift+R)');
  console.log('='.repeat(60) + '\n');
}

// Run
const dryRun = process.argv.includes('--dry-run');
uploadData(dryRun).catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
