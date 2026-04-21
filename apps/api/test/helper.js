import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const _dirname = dirname(__filename);

// Test project configuration
export const TEST_PROJECT_ID = 'finventory-integration-test';

// Mock Firebase Auth tokens for testing
// In a real scenario with Firebase Auth Emulator, these would be generated
export const createMockToken = (user) => {
  return `mock-token-${user.uid}`;
};

// Test user fixtures
export const TEST_USERS = {
  seller: {
    uid: 'test-seller-001',
    email: 'seller@test.com',
    displayName: 'Test Seller',
    phoneNumber: '+1234567890',
    photoURL: 'https://example.com/seller.jpg'
  },
  buyer: {
    uid: 'test-buyer-001',
    email: 'buyer@test.com',
    displayName: 'Test Buyer',
    phoneNumber: '+0987654321',
    photoURL: 'https://example.com/buyer.jpg'
  },
  admin: {
    uid: 'test-admin-001',
    email: 'admin@test.com',
    displayName: 'Test Admin'
  }
};

// Test listing fixtures
export const TEST_LISTINGS = {
  gradeA: {
    species: 'Pacific Salmon',
    grade: 'A',
    quantity: 25,
    unit: 'lbs',
    pricePerUnit: 18.50,
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: 'Fisherman\'s Wharf, San Francisco, CA'
    },
    deliveryAvailable: true,
    deliveryFee: 15,
    photos: ['https://example.com/salmon1.jpg']
  },
  sushi: {
    species: 'Bluefin Tuna',
    grade: 'sushi',
    quantity: 10,
    unit: 'lbs',
    pricePerUnit: 65.00,
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
      address: 'Santa Monica Pier, CA'
    },
    sushiCertNumber: 'SC-2024-001',
    deliveryAvailable: false,
    photos: ['https://example.com/tuna1.jpg']
  },
  gradeB: {
    species: 'Atlantic Cod',
    grade: 'B',
    quantity: 50,
    unit: 'lbs',
    pricePerUnit: 8.00,
    location: {
      latitude: 42.3601,
      longitude: -71.0589,
      address: 'Boston Harbor, MA'
    },
    deliveryAvailable: true,
    deliveryFee: 10,
    photos: ['https://example.com/cod1.jpg']
  }
};

// Test order fixtures
export const TEST_ORDERS = {
  small: {
    quantity: 2,
    deliveryOption: 'pickup'
  },
  medium: {
    quantity: 5,
    deliveryOption: 'delivery',
    deliveryAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102'
    }
  },
  large: {
    quantity: 10,
    deliveryOption: 'pickup'
  }
};

// Test standing order fixtures
export const TEST_STANDING_ORDERS = {
  basic: {
    species: ['Salmon', 'Tuna'],
    grades: ['sushi', 'A'],
    maxPrice: 50,
    maxDistance: 30,
    minQuantity: 5,
    deliveryRequired: false
  },
  strict: {
    species: ['Sushi Grade Tuna'],
    grades: ['sushi'],
    maxPrice: 80,
    maxDistance: 15,
    minQuantity: 10,
    deliveryRequired: true
  },
  any: {
    species: [],
    grades: [],
    maxPrice: null,
    maxDistance: 100,
    minQuantity: 1,
    deliveryRequired: false
  }
};

// Initialize Firebase Admin for testing
export async function initializeTestAdmin() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: TEST_PROJECT_ID,
      credential: admin.credential.cert({
        type: 'service_account',
        project_id: TEST_PROJECT_ID,
        private_key_id: 'test-key-id',
        private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MhgwMbRvI0MBZhpJ\n-----END RSA PRIVATE KEY-----\n',
        client_email: 'test@finventory-integration-test.iam.gserviceaccount.com',
        client_id: '123456789',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
      })
    });
  }
  return admin.app();
}

// Cleanup test data
export async function cleanupTestData() {
  const db = admin.firestore();
  const collections = ['listings', 'orders', 'standingOrders', 'ai_analyses'];

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    if (snapshot.size > 0) {
      await batch.commit();
    }
  }

  // Cleanup Realtime Database if needed
  try {
    const rtdb = admin.database();
    await rtdb.ref('live_inventory').remove();
  } catch {
    // RTDB might not be configured
  }
}

// Verify listing structure
export function validateListingStructure(listing) {
  expect(listing).to.have.property('id');
  expect(listing).to.have.property('species');
  expect(listing).to.have.property('grade');
  expect(listing).to.have.property('quantity');
  expect(listing).to.have.property('unit');
  expect(listing).to.have.property('pricePerUnit');
  expect(listing).to.have.property('sellerId');
  expect(listing).to.have.property('sellerName');
  expect(listing).to.have.property('status');
  expect(listing).to.have.property('location');
  expect(listing.location).to.have.property('latitude');
  expect(listing.location).to.have.property('longitude');
  expect(listing.location).to.have.property('geohash');
  expect(listing).to.have.property('createdAt');
  expect(listing).to.have.property('updatedAt');
  expect(listing).to.have.property('expiresAt');
  expect(listing).to.have.property('freshnessDate');
  expect(listing).to.have.property('photos');
}

// Verify order structure
export function validateOrderStructure(order) {
  expect(order).to.have.property('id');
  expect(order).to.have.property('listingId');
  expect(order).to.have.property('buyerId');
  expect(order).to.have.property('sellerId');
  expect(order).to.have.property('quantity');
  expect(order).to.have.property('totalPrice');
  expect(order).to.have.property('status');
  expect(order).to.have.property('pickupQRCode');
  expect(order).to.have.property('deliveryOption');
  expect(order).to.have.property('createdAt');
}

// Verify standing order structure
export function validateStandingOrderStructure(so) {
  expect(so).to.have.property('id');
  expect(so).to.have.property('buyerId');
  expect(so).to.have.property('species');
  expect(so).to.have.property('grades');
  expect(so).to.have.property('maxDistance');
  expect(so).to.have.property('minQuantity');
  expect(so).to.have.property('deliveryRequired');
  expect(so).to.have.property('isActive');
  expect(so).to.have.property('createdAt');
}

// Calculate distance between two points (haversine formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Wait for a condition with timeout
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}

// Generate random coordinates within a radius
export function generateRandomCoordinates(centerLat, centerLng, radiusKm) {
  const radiusInDegrees = radiusKm / 111.32; // Rough conversion
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  return {
    latitude: centerLat + y,
    longitude: centerLng + x
  };
}

// Deep compare two objects (for Firestore timestamps)
export function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// Test utilities export
export default {
  TEST_PROJECT_ID,
  TEST_USERS,
  TEST_LISTINGS,
  TEST_ORDERS,
  TEST_STANDING_ORDERS,
  createMockToken,
  initializeTestAdmin,
  cleanupTestData,
  validateListingStructure,
  validateOrderStructure,
  validateStandingOrderStructure,
  calculateDistance,
  waitFor,
  generateRandomCoordinates,
  deepEqual
};
