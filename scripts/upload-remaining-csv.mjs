#!/usr/bin/env node
// Upload remaining CSV data (orders, reviews, standing_orders, geo_index) to Firestore
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const PROJECT_ID = 'finventory-1776558252';

function toTimestamp(isoStr) {
  if (!isoStr) return null;
  try {
    const date = new Date(isoStr);
    return Timestamp.fromDate(date);
  } catch {
    return null;
  }
}

function readCSV(filepath) {
  const content = readFileSync(filepath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true
  });
}

function transformOrder(row) {
  return {
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    listingId: row.listing_id,
    quantity: parseInt(row.quantity, 10) || 0,
    unit: row.unit,
    totalPrice: parseFloat(row.total_price) || 0,
    currency: row.currency || 'USD',
    status: row.status,
    deliveryMethod: row.delivery_method,
    deliveryAddress: row.delivery_address || null,
    pickupCode: row.pickup_code || null,
    paymentStatus: row.payment_status,
    stripePaymentIntentId: row.stripe_payment_intent_id || null,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at),
    expiresAt: toTimestamp(row.expires_at)
  };
}

function transformReview(row) {
  return {
    orderId: row.order_id,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer_name,
    sellerId: row.seller_id,
    rating: parseInt(row.rating, 10) || 0,
    qualityRating: parseInt(row.quality_rating, 10) || null,
    deliveryRating: parseInt(row.delivery_rating, 10) || null,
    comment: row.comment || null,
    wouldBuyAgain: row.would_buy_again === '1',
    createdAt: toTimestamp(row.created_at)
  };
}

function transformStandingOrder(row) {
  return {
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    species: row.species ? row.species.split(';') : [],
    grades: row.grades ? row.grades.split(';') : [],
    minQuantity: parseInt(row.min_quantity, 10) || null,
    maxQuantity: parseInt(row.max_quantity, 10) || null,
    preferredUnit: row.preferred_unit || null,
    maxPricePerUnit: parseFloat(row.max_price_per_unit) || null,
    currency: row.currency || 'USD',
    maxDistanceMiles: parseInt(row.max_distance_miles, 10) || null,
    location: row.location_latitude ? {
      latitude: parseFloat(row.location_latitude),
      longitude: parseFloat(row.location_longitude),
      address: row.location_address
    } : null,
    deliveryRequired: row.delivery_required === '1',
    isActive: row.is_active === '1',
    notificationMethods: row.notification_methods ? row.notification_methods.split(';') : ['fcm'],
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };
}

function transformGeoIndex(row) {
  return {
    listingId: row.listing_id,
    sellerId: row.seller_id,
    geohash: row.geohash,
    precision: parseInt(row.precision, 10) || 0,
    latitude: parseFloat(row.latitude) || 0,
    longitude: parseFloat(row.longitude) || 0,
    species: row.species,
    grade: row.grade,
    status: row.status,
    pricePerUnit: parseFloat(row.price_per_unit) || 0,
    expiresAt: toTimestamp(row.expires_at),
    updatedAt: toTimestamp(row.updated_at)
  };
}

async function uploadData() {
  console.log('\n' + '='.repeat(60));
  console.log('Uploading Remaining CSV Data to Firestore');
  console.log(`Project: ${PROJECT_ID}`);
  console.log('='.repeat(60) + '\n');

  // Read CSV files
  console.log('1. Reading CSV files...');
  const orders = readCSV('/tmp/orders.csv');
  const reviews = readCSV('/tmp/reviews.csv');
  const standingOrders = readCSV('/tmp/standing_orders.csv');
  const geoIndex = readCSV('/tmp/geo_index.csv');
  
  console.log(`   - ${orders.length} orders`);
  console.log(`   - ${reviews.length} reviews`);
  console.log(`   - ${standingOrders.length} standing orders`);
  console.log(`   - ${geoIndex.length} geo index entries\n`);

  // Initialize Firebase Admin
  console.log('2. Initializing Firebase Admin...');
  let app;
  if (getApps().length === 0) {
    app = initializeApp({ projectId: PROJECT_ID });
  }
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  // Upload orders
  console.log('\n3. Uploading orders...');
  let orderCount = 0;
  for (const row of orders) {
    const data = transformOrder(row);
    await db.collection('orders').doc(row.id).set(data, { merge: true });
    orderCount++;
    if (orderCount % 500 === 0) {
      process.stdout.write(`\r   Progress: ${orderCount}/${orders.length}`);
    }
  }
  console.log(`\r   ✓ Uploaded ${orderCount}/${orders.length} orders`);

  // Upload reviews
  console.log('\n4. Uploading reviews...');
  let reviewCount = 0;
  for (const row of reviews) {
    const data = transformReview(row);
    await db.collection('reviews').doc(row.id).set(data, { merge: true });
    reviewCount++;
    if (reviewCount % 500 === 0) {
      process.stdout.write(`\r   Progress: ${reviewCount}/${reviews.length}`);
    }
  }
  console.log(`\r   ✓ Uploaded ${reviewCount}/${reviews.length} reviews`);

  // Upload standing orders
  console.log('\n5. Uploading standing orders...');
  let soCount = 0;
  for (const row of standingOrders) {
    const data = transformStandingOrder(row);
    await db.collection('standingOrders').doc(row.id).set(data, { merge: true });
    soCount++;
    if (soCount % 100 === 0) {
      process.stdout.write(`\r   Progress: ${soCount}/${standingOrders.length}`);
    }
  }
  console.log(`\r   ✓ Uploaded ${soCount}/${standingOrders.length} standing orders`);

  // Upload geo index
  console.log('\n6. Uploading geo index...');
  let geoCount = 0;
  for (const row of geoIndex) {
    const data = transformGeoIndex(row);
    await db.collection('geoIndex').doc(row.id).set(data, { merge: true });
    geoCount++;
    if (geoCount % 50 === 0) {
      process.stdout.write(`\r   Progress: ${geoCount}/${geoIndex.length}`);
    }
  }
  console.log(`\r   ✓ Uploaded ${geoCount}/${geoIndex.length} geo index entries`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ All data uploaded!');
  console.log('='.repeat(60) + '\n');
}

uploadData().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
