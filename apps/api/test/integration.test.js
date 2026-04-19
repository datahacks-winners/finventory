import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import admin from 'firebase-admin';
import app from '../src/index.js';

// Test configuration
const TEST_PROJECT_ID = 'finventory-integration-test';
const _API_URL = process.env.API_URL || 'http://localhost:8080';

// Mock user data
const TEST_SELLER = {
  uid: 'test-seller-001',
  email: 'seller@test.com',
  name: 'Test Seller'
};

const _TEST_BUYER = {
  uid: 'test-buyer-001',
  email: 'buyer@test.com',
  name: 'Test Buyer'
};

// Test data store
let testData = {
  sellerToken: 'mock-seller-test-seller-001',
  buyerToken: 'mock-buyer-test-buyer-001',
  listingId: null,
  orderId: null,
  standingOrderId: null
};

describe('Finventory Integration Tests', function() {
  this.timeout(30000);

  before(async function() {
    // Enable test mode for mock authentication
    process.env.TEST_MODE = 'true';
    process.env.FIRESTORE_PROJECT_ID = TEST_PROJECT_ID;

    // Configure Firestore to use emulator
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

    // Initialize Firebase Admin for tests (using emulator)
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: TEST_PROJECT_ID
      });
    }
  });

  after(async function() {
    // Cleanup test data
    const db = admin.firestore();
    const collections = ['listings', 'orders', 'standingOrders'];

    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    if (admin.apps.length) {
      await admin.app().delete();
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).to.have.property('status', 'ok');
      expect(res.body).to.have.property('timestamp');
    });
  });

  describe('Listings API', () => {
    describe('POST /api/listings', () => {
      it('should reject unauthenticated requests', async () => {
        const res = await request(app)
          .post('/api/listings')
          .send({
            species: 'Salmon',
            grade: 'A',
            quantity: 10,
            pricePerUnit: 25
          })
          .expect(401);

        expect(res.body).to.have.property('error', 'Unauthorized');
      });

      it('should reject missing required fields', async () => {
        const res = await request(app)
          .post('/api/listings')
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send({
            species: 'Salmon',
            grade: 'A'
            // Missing quantity, pricePerUnit, location
          })
          .expect(400);

        expect(res.body).to.have.property('error');
        expect(res.body.error).to.include('Missing required field');
      });

      it('should create a Grade A listing successfully', async () => {
        const listingData = {
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
          photos: ['https://example.com/salmon1.jpg', 'https://example.com/salmon2.jpg']
        };

        const res = await request(app)
          .post('/api/listings')
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send(listingData)
          .expect(200);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('listingId');
        expect(res.body).to.have.property('message', 'Listing created successfully');

        testData.listingId = res.body.listingId;
      });

      it('should require sushi certification for sushi grade', async () => {
        const listingData = {
          species: 'Bluefin Tuna',
          grade: 'sushi',
          quantity: 10,
          pricePerUnit: 45.00,
          location: {
            latitude: 34.0522,
            longitude: -118.2437,
            address: 'Santa Monica Pier, CA'
          }
        };

        const res = await request(app)
          .post('/api/listings')
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send(listingData)
          .expect(400);

        expect(res.body).to.have.property('error', 'Sushi certification required for sushi grade');
      });

      it('should create a sushi grade listing with certification', async () => {
        const listingData = {
          species: 'Bluefin Tuna',
          grade: 'sushi',
          quantity: 8,
          pricePerUnit: 65.00,
          location: {
            latitude: 34.0522,
            longitude: -118.2437,
            address: 'Santa Monica Pier, CA'
          },
          sushiCertNumber: 'SC-2024-001',
          deliveryAvailable: false,
          photos: ['https://example.com/tuna1.jpg']
        };

        const res = await request(app)
          .post('/api/listings')
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send(listingData)
          .expect(200);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('listingId');
      });
    });

    describe('GET /api/listings', () => {
      it('should return active listings', async () => {
        const res = await request(app)
          .get('/api/listings')
          .expect(200);

        expect(res.body).to.have.property('listings');
        expect(res.body).to.have.property('count');
        expect(res.body.listings).to.be.an('array');
        expect(res.body.listings.length).to.be.greaterThan(0);
      });

      it('should filter by grade', async () => {
        const res = await request(app)
          .get('/api/listings?grade=A')
          .expect(200);

        expect(res.body.listings).to.be.an('array');
        res.body.listings.forEach(listing => {
          expect(listing.grade).to.equal('A');
        });
      });

      it('should filter by species (case insensitive)', async () => {
        const res = await request(app)
          .get('/api/listings?species=salmon')
          .expect(200);

        expect(res.body.listings).to.be.an('array');
        res.body.listings.forEach(listing => {
          expect(listing.species.toLowerCase()).to.include('salmon');
        });
      });

      it('should filter by location radius', async () => {
        const res = await request(app)
          .get('/api/listings?lat=37.7749&lng=-122.4194&radius=50')
          .expect(200);

        expect(res.body.listings).to.be.an('array');
        // All returned listings should have distance calculated
        res.body.listings.forEach(listing => {
          expect(listing).to.have.property('distance');
          expect(listing.distance).to.be.a('number');
        });
      });
    });

    describe('GET /api/listings/:id', () => {
      it('should return a single listing', async () => {
        const res = await request(app)
          .get(`/api/listings/${testData.listingId}`)
          .expect(200);

        expect(res.body).to.have.property('id', testData.listingId);
        expect(res.body).to.have.property('species');
        expect(res.body).to.have.property('grade');
        expect(res.body).to.have.property('quantity');
        expect(res.body).to.have.property('pricePerUnit');
        expect(res.body).to.have.property('sellerId');
      });

      it('should return 404 for non-existent listing', async () => {
        const res = await request(app)
          .get('/api/listings/non-existent-id')
          .expect(404);

        expect(res.body).to.have.property('error', 'Listing not found');
      });
    });
  });

  describe('Orders API', () => {
    describe('POST /api/orders', () => {
      it('should reject unauthenticated requests', async () => {
        const res = await request(app)
          .post('/api/orders')
          .send({
            listingId: testData.listingId,
            quantity: 5
          })
          .expect(401);

        expect(res.body).to.have.property('error', 'Unauthorized');
      });

      it('should reject missing required fields', async () => {
        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send({})
          .expect(400);

        expect(res.body).to.have.property('error', 'Missing required fields');
      });

      it('should reject order for non-existent listing', async () => {
        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send({
            listingId: 'non-existent-listing',
            quantity: 5
          })
          .expect(404);

        expect(res.body).to.have.property('error', 'Listing not found');
      });

      it('should reject self-purchase (seller buying own listing)', async () => {
        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send({
            listingId: testData.listingId,
            quantity: 5
          })
          .expect(400);

        expect(res.body).to.have.property('error', 'Cannot buy your own listing');
      });

      it('should reject order exceeding available quantity', async () => {
        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send({
            listingId: testData.listingId,
            quantity: 9999
          })
          .expect(400);

        expect(res.body).to.have.property('error', 'Not enough quantity available');
      });

      it('should create an order successfully', async () => {
        const orderData = {
          listingId: testData.listingId,
          quantity: 5,
          deliveryOption: 'pickup'
        };

        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send(orderData)
          .expect(200);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('orderId');
        expect(res.body).to.have.property('pickupQRCode');
        expect(res.body.pickupQRCode).to.be.a('string');
        expect(res.body.pickupQRCode.length).to.be.greaterThan(0);

        testData.orderId = res.body.orderId;
      });

      it('should create order with delivery option', async () => {
        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send({
            listingId: testData.listingId,
            quantity: 3,
            deliveryOption: 'delivery',
            deliveryAddress: {
              street: '123 Test St',
              city: 'San Francisco',
              state: 'CA',
              zip: '94102'
            }
          })
          .expect(200);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('orderId');
      });

      it('should reduce listing quantity after order', async () => {
        // Get the listing and verify quantity was reduced
        const res = await request(app)
          .get(`/api/listings/${testData.listingId}`)
          .expect(200);

        // Original 25 - 5 (first order) - 3 (second order) = 17
        expect(res.body.quantity).to.equal(17);
      });
    });

    describe('GET /api/orders/my-orders', () => {
      it('should reject unauthenticated requests', async () => {
        const res = await request(app)
          .get('/api/orders/my-orders')
          .expect(401);

        expect(res.body).to.have.property('error', 'Unauthorized');
      });

      it('should return buyer orders with listing details', async () => {
        const res = await request(app)
          .get('/api/orders/my-orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .expect(200);

        expect(res.body).to.have.property('orders');
        expect(res.body.orders).to.be.an('array');
        expect(res.body.orders.length).to.be.greaterThan(0);

        const order = res.body.orders[0];
        expect(order).to.have.property('listingId');
        expect(order).to.have.property('buyerId');
        expect(order).to.have.property('quantity');
        expect(order).to.have.property('totalPrice');
        expect(order).to.have.property('status');
        expect(order).to.have.property('pickupQRCode');
        expect(order).to.have.property('listing');
        expect(order.listing).to.have.property('species');
        expect(order.listing).to.have.property('grade');
      });
    });

    describe('POST /api/orders/:id/confirm-pickup', () => {
      it('should reject invalid QR code', async () => {
        const res = await request(app)
          .post(`/api/orders/${testData.orderId}/confirm-pickup`)
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send({
            qrCode: 'invalid-qr-code'
          })
          .expect(403);

        expect(res.body).to.have.property('error', 'Invalid QR code');
      });

      it('should confirm pickup with valid QR code', async () => {
        // First get the order to retrieve the QR code
        const ordersRes = await request(app)
          .get('/api/orders/my-orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .expect(200);

        const order = ordersRes.body.orders.find(o => o.id === testData.orderId);
        expect(order).to.not.be.undefined;

        const res = await request(app)
          .post(`/api/orders/${testData.orderId}/confirm-pickup`)
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send({
            qrCode: order.pickupQRCode
          })
          .expect(200);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('alreadyPickedUp', false);
      });

      it('should return alreadyPickedUp=true for completed order', async () => {
        const ordersRes = await request(app)
          .get('/api/orders/my-orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .expect(200);

        const order = ordersRes.body.orders.find(o => o.id === testData.orderId);

        const res = await request(app)
          .post(`/api/orders/${testData.orderId}/confirm-pickup`)
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send({
            qrCode: order.pickupQRCode
          })
          .expect(200);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('alreadyPickedUp', true);
      });

      it('should reject pickup for cancelled order', async () => {
        // Create a new order and cancel it
        const createRes = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send({
            listingId: testData.listingId,
            quantity: 1
          })
          .expect(200);

        const newOrderId = createRes.body.orderId;

        // Cancel the order
        await request(app)
          .post(`/api/orders/${newOrderId}/cancel`)
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .expect(200);

        // Try to confirm pickup
        const res = await request(app)
          .post(`/api/orders/${newOrderId}/confirm-pickup`)
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .send({
            qrCode: 'any-qr-code'
          })
          .expect(400);

        expect(res.body).to.have.property('error', 'Order is cancelled');
      });
    });

    describe('POST /api/orders/:id/cancel', () => {
      it('should reject unauthenticated requests', async () => {
        const res = await request(app)
          .post(`/api/orders/${testData.orderId}/cancel`)
          .expect(401);

        expect(res.body).to.have.property('error', 'Unauthorized');
      });

      it('should reject cancellation by non-buyer', async () => {
        const res = await request(app)
          .post(`/api/orders/${testData.orderId}/cancel`)
          .set('Authorization', `Bearer ${testData.sellerToken}`)
          .expect(403);

        expect(res.body).to.have.property('error', 'Only buyer can cancel');
      });

      it('should reject cancellation of completed order', async () => {
        // Order was already picked up in previous test
        const res = await request(app)
          .post(`/api/orders/${testData.orderId}/cancel`)
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .expect(400);

        expect(res.body).to.have.property('error', 'Cannot cancel completed order');
      });

      it('should cancel pending order and restore quantity', async () => {
        // Create a new order
        const createRes = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send({
            listingId: testData.listingId,
            quantity: 2
          })
          .expect(200);

        const newOrderId = createRes.body.orderId;

        // Get listing quantity before cancel
        const listingBefore = await request(app)
          .get(`/api/listings/${testData.listingId}`)
          .expect(200);
        const quantityBefore = listingBefore.body.quantity;

        // Cancel the order
        const res = await request(app)
          .post(`/api/orders/${newOrderId}/cancel`)
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .expect(200);

        expect(res.body).to.have.property('success', true);

        // Verify quantity was restored
        const listingAfter = await request(app)
          .get(`/api/listings/${testData.listingId}`)
          .expect(200);

        expect(listingAfter.body.quantity).to.equal(quantityBefore + 2);
      });
    });
  });

  describe('Standing Orders API', () => {
    describe('POST /api/standing-orders', () => {
      it('should reject unauthenticated requests', async () => {
        const res = await request(app)
          .post('/api/standing-orders')
          .send({
            species: ['Salmon'],
            grades: ['A'],
            maxPrice: 30
          })
          .expect(401);

        expect(res.body).to.have.property('error', 'Unauthorized');
      });

      it('should create a standing order', async () => {
        const standingOrderData = {
          species: ['Salmon', 'Tuna'],
          grades: ['sushi', 'A'],
          maxPrice: 50,
          maxDistance: 30,
          minQuantity: 5,
          deliveryRequired: true
        };

        const res = await request(app)
          .post('/api/standing-orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send(standingOrderData)
          .expect(200);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('standingOrderId');

        testData.standingOrderId = res.body.standingOrderId;
      });

      it('should create standing order with defaults', async () => {
        const res = await request(app)
          .post('/api/standing-orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send({})
          .expect(200);

        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('standingOrderId');
      });
    });

    describe('GET /api/standing-orders', () => {
      it('should reject unauthenticated requests', async () => {
        const res = await request(app)
          .get('/api/standing-orders')
          .expect(401);

        expect(res.body).to.have.property('error', 'Unauthorized');
      });

      it('should return buyer standing orders', async () => {
        const res = await request(app)
          .get('/api/standing-orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .expect(200);

        expect(res.body).to.have.property('standingOrders');
        expect(res.body.standingOrders).to.be.an('array');
        expect(res.body.standingOrders.length).to.be.greaterThan(0);

        const standingOrder = res.body.standingOrders[0];
        expect(standingOrder).to.have.property('buyerId');
        expect(standingOrder).to.have.property('isActive', true);
      });
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full seller workflow', async () => {
      // 1. Create a listing
      const listingRes = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${testData.sellerToken}`)
        .send({
          species: 'Halibut',
          grade: 'A',
          quantity: 15,
          pricePerUnit: 22.00,
          location: {
            latitude: 47.6062,
            longitude: -122.3321,
            address: 'Seattle Fishermen\'s Terminal'
          },
          deliveryAvailable: true,
          deliveryFee: 20
        })
        .expect(200);

      const listingId = listingRes.body.listingId;
      expect(listingId).to.not.be.undefined;

      // 2. Verify listing appears in browse
      const browseRes = await request(app)
        .get('/api/listings')
        .expect(200);

      const foundListing = browseRes.body.listings.find(l => l.id === listingId);
      expect(foundListing).to.not.be.undefined;
      expect(foundListing.species).to.equal('halibut');

      // 3. Verify listing details
      const detailRes = await request(app)
        .get(`/api/listings/${listingId}`)
        .expect(200);

      expect(detailRes.body.status).to.equal('active');
      expect(detailRes.body.sellerId).to.equal(TEST_SELLER.uid);
    });

    it('should complete full buyer workflow', async () => {
      // 1. Create a standing order
      const _soRes = await request(app)
        .post('/api/standing-orders')
        .set('Authorization', `Bearer ${testData.buyerToken}`)
        .send({
          species: ['Halibut', 'Cod'],
          grades: ['A'],
          maxPrice: 25,
          maxDistance: 50,
          minQuantity: 3
        })
        .expect(200);

      // 2. Browse listings
      const browseRes = await request(app)
        .get('/api/listings?species=halibut&grade=A')
        .expect(200);

      expect(browseRes.body.listings).to.be.an('array');

      if (browseRes.body.listings.length > 0) {
        const targetListing = browseRes.body.listings[0];

        // 3. Create an order
        const orderRes = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .send({
            listingId: targetListing.id,
            quantity: 3,
            deliveryOption: 'pickup'
          })
          .expect(200);

        const orderId = orderRes.body.orderId;
        expect(orderRes.body.pickupQRCode).to.not.be.undefined;

        // 4. View my orders
        const myOrdersRes = await request(app)
          .get('/api/orders/my-orders')
          .set('Authorization', `Bearer ${testData.buyerToken}`)
          .expect(200);

        const myOrder = myOrdersRes.body.orders.find(o => o.id === orderId);
        expect(myOrder).to.not.be.undefined;
        expect(myOrder.status).to.equal('pending');
      }
    });

    it('should handle complete order lifecycle', async () => {
      // Create a fresh listing
      const listingRes = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${testData.sellerToken}`)
        .send({
          species: 'Dungeness Crab',
          grade: 'A',
          quantity: 20,
          pricePerUnit: 12.00,
          location: {
            latitude: 45.5152,
            longitude: -122.6784,
            address: 'Portland, OR'
          }
        })
        .expect(200);

      const listingId = listingRes.body.listingId;

      // Create an order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testData.buyerToken}`)
        .send({
          listingId: listingId,
          quantity: 5,
          deliveryOption: 'pickup'
        })
        .expect(200);

      const orderId = orderRes.body.orderId;
      const qrCode = orderRes.body.pickupQRCode;

      // Verify order is pending
      const ordersRes = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${testData.buyerToken}`)
        .expect(200);

      const order = ordersRes.body.orders.find(o => o.id === orderId);
      expect(order.status).to.equal('pending');

      // Verify quantity reduced
      const listingRes2 = await request(app)
        .get(`/api/listings/${listingId}`)
        .expect(200);
      expect(listingRes2.body.quantity).to.equal(15); // 20 - 5

      // Confirm pickup
      const pickupRes = await request(app)
        .post(`/api/orders/${orderId}/confirm-pickup`)
        .set('Authorization', `Bearer ${testData.sellerToken}`)
        .send({ qrCode })
        .expect(200);

      expect(pickupRes.body.success).to.equal(true);
    });
  });
});
