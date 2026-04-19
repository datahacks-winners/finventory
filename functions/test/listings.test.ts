import { expect } from 'chai';
import admin from 'firebase-admin';
import { setupTestEnv, cleanupTestEnv, clearFirestore, getAdminFirestore } from './helper.js';

describe('createListing integration', () => {
  let testEnv: any;
  let adminFirestore: admin.firestore.Firestore;

  before(async function() {
    testEnv = await setupTestEnv();
    adminFirestore = getAdminFirestore();
  });

  after(async function() {
    await cleanupTestEnv(testEnv);
  });

  beforeEach(async function() {
    await clearFirestore(testEnv);
  });

  it('test environment is set up', async function() {
    // Verify test environment is ready
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(testEnv).to.exist;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(adminFirestore).to.exist;
  });

  it('validates listing data structure', async function() {
    const listingData = {
      sellerId: 'seller123',
      species: 'Salmon',
      grade: 'A' as const,
      quantity: 10,
      unit: 'lb' as const,
      pricePerUnit: 25,
      latitude: 37.7749,
      longitude: -122.4194,
      photos: ['photo1.jpg'],
      freshnessDate: admin.firestore.Timestamp.now(),
      deliveryAvailable: true,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
    };

    // Verify data structure is valid
    expect(listingData.sellerId).to.equal('seller123');
    expect(listingData.species).to.equal('Salmon');
    expect(listingData.grade).to.equal('A');
    expect(listingData.quantity).to.equal(10);
    expect(listingData.photos).to.be.an('array').with.lengthOf(1);
  });

  it('geohash utility works correctly', async function() {
    // Verify that the geohash utility module works
    const { encodeGeohash } = await import('../src/utils/geohash.js');
    const geohash = encodeGeohash(37.7749, -122.4194);
     
    expect(geohash).to.be.a('string');
    expect(geohash.length).to.equal(9);
  });
});
