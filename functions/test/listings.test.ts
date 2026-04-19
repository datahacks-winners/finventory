import { expect } from 'chai';
import * as admin from 'firebase-admin';
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

  it('creates listing with valid data', async function() {
    // Import the actual function
     
    const { createListing } = await import('../src/api/listings.js');

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

    const context: any = {
      auth: { uid: 'seller123', token: {} },
    };

    const result: any = await (createListing as any)(listingData, context);

    expect(result).to.have.property('success', true);
    expect(result).to.have.property('listingId').that.is.a('string');

    // Verify listing was created in Firestore
    const doc = await adminFirestore.collection('listings').doc(result.listingId).get();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(doc.exists).to.be.true;
     
    expect(doc.data()?.species).to.equal('salmon'); // stored lowercase
  });

  it('rejects unauthenticated requests', async function() {
    const { createListing } = await import('../src/api/listings.js');

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

    const context: any = {};

    try {
      await (createListing as any)(listingData, context);
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).to.have.property('code', 'unauthenticated');
    }
  });
});
