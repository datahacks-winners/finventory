import * as firebase from '@firebase/rules-unit-testing';

const PROJECT_ID = 'finventory-test';

describe('Firestore Security Rules', () => {
  let testEnv: firebase.RulesTestEnvironment;

  before(async () => {
    testEnv = await firebase.initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rulesPath: '../../firestore.rules',
        host: 'localhost',
        port: 8080,
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Users Collection', () => {
    it('allows user to read own profile', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('users').doc('user123').get()
      );
    });

    it('denies user from reading another user profile', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('users').doc('other-user').get()
      );
    });

    it('allows user to create own profile', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('users').doc('user123').set({
          id: 'user123',
          displayName: 'Test User',
          email: 'test@example.com',
        })
      );
    });

    it('denies creating profile with different userId', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('users').doc('user123').set({
          id: 'other-user',
          displayName: 'Hacked',
        })
      );
    });

    it('allows user to update own profile', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('users').doc('user123').update({ displayName: 'New Name' })
      );
    });

    it('denies user from updating another user profile', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('users').doc('other-user').update({ displayName: 'Hacked' })
      );
    });

    it('denies deletion of user profiles', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('users').doc('user123').delete()
      );
    });
  });

  describe('User Notifications Subcollection', () => {
    it('allows user to read own notifications', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('users').doc('user123').collection('notifications').doc('notif1').get()
      );
    });

    it('denies user from reading another user notifications', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('users').doc('other-user').collection('notifications').get()
      );
    });

    it('allows user to create own notifications', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('users').doc('user123').collection('notifications').add({
          message: 'Test notification',
          read: false,
        })
      );
    });
  });

  describe('Listings Collection', () => {
    it('allows anonymous user to browse listings', async () => {
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await firebase.assertSucceeds(
        anonDb.collection('listings').get()
      );
    });

    it('allows authenticated user to create listing', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('listings').add({
          sellerId: 'user123',
          title: 'Fresh Fish',
          price: 25,
          description: 'Fresh catch',
        })
      );
    });

    it('denies creating listing with wrong sellerId', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('listings').add({
          sellerId: 'other-user',
          title: 'Fake Listing',
          price: 25,
        })
      );
    });

    it('allows seller to update own listing', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('listings').doc('listing1').update({
          title: 'Updated Title',
          sellerId: 'user123',
        })
      );
    });

    it('denies non-seller from updating listing', async () => {
      const db = testEnv.authenticatedContext('other-user').firestore();
      await firebase.assertFails(
        db.collection('listings').doc('listing1').update({
          title: 'Hacked',
          sellerId: 'user123',
        })
      );
    });

    it('allows seller to delete own listing', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('listings').doc('listing1').delete()
      );
    });
  });

  describe('Listing Views Subcollection', () => {
    it('allows anonymous user to read views', async () => {
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await firebase.assertSucceeds(
        anonDb.collection('listings').doc('listing1').collection('views').get()
      );
    });

    it('allows authenticated user to create view', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('listings').doc('listing1').collection('views').add({
          viewerId: 'user123',
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        })
      );
    });

    it('denies updating views', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('listings').doc('listing1').collection('views').doc('view1').update({
          viewed: true,
        })
      );
    });
  });

  describe('Orders Collection', () => {
    it('denies anonymous user from creating order', async () => {
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await firebase.assertFails(
        anonDb.collection('orders').add({
          buyerId: 'anon',
          sellerId: 'seller123',
          total: 100,
        })
      );
    });

    it('allows authenticated user to create order', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('orders').add({
          buyerId: 'buyer123',
          sellerId: 'seller123',
          total: 100,
        })
      );
    });

    it('denies creating order with different buyerId', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertFails(
        db.collection('orders').add({
          buyerId: 'other-buyer',
          sellerId: 'seller123',
          total: 100,
        })
      );
    });

    it('allows buyer to read own order', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('orders').doc('order1').get()
      );
    });

    it('allows seller to read order', async () => {
      const db = testEnv.authenticatedContext('seller123').firestore();
      await firebase.assertSucceeds(
        db.collection('orders').doc('order1').get()
      );
    });

    it('denies unrelated user from reading order', async () => {
      const db = testEnv.authenticatedContext('unrelated-user').firestore();
      await firebase.assertFails(
        db.collection('orders').doc('order1').get()
      );
    });

    it('allows buyer to update order', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('orders').doc('order1').update({
          status: 'confirmed',
        })
      );
    });

    it('denies deletion of orders', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertFails(
        db.collection('orders').doc('order1').delete()
      );
    });
  });

  describe('Standing Orders Collection', () => {
    it('allows user to create own standing order', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('standingOrders').add({
          buyerId: 'buyer123',
          frequency: 'weekly',
          items: ['fish1'],
        })
      );
    });

    it('denies creating standing order for different buyer', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertFails(
        db.collection('standingOrders').add({
          buyerId: 'other-buyer',
          frequency: 'weekly',
        })
      );
    });

    it('allows user to read own standing orders', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('standingOrders').doc('so1').get()
      );
    });

    it('denies user from reading other standing orders', async () => {
      const db = testEnv.authenticatedContext('other-buyer').firestore();
      await firebase.assertFails(
        db.collection('standingOrders').doc('so1').get()
      );
    });
  });

  describe('Reviews Collection', () => {
    it('allows anonymous user to read reviews', async () => {
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await firebase.assertSucceeds(
        anonDb.collection('reviews').get()
      );
    });

    it('allows authenticated user to create review', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('reviews').add({
          buyerId: 'user123',
          sellerId: 'seller123',
          rating: 5,
          comment: 'Great fish!',
        })
      );
    });

    it('allows buyer to update own review', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('reviews').doc('review1').update({
          rating: 4,
          buyerId: 'buyer123',
        })
      );
    });

    it('denies non-buyer from updating review', async () => {
      const db = testEnv.authenticatedContext('other-user').firestore();
      await firebase.assertFails(
        db.collection('reviews').doc('review1').update({
          rating: 1,
          buyerId: 'buyer123',
        })
      );
    });

    it('allows buyer to delete own review', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('reviews').doc('review1').delete()
      );
    });
  });

  describe('Messages Collection', () => {
    it('denies anonymous user from creating message', async () => {
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await firebase.assertFails(
        anonDb.collection('messages').add({
          senderId: 'anon',
          receiverId: 'user123',
          content: 'Hello',
        })
      );
    });

    it('allows authenticated user to create message as sender', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('messages').add({
          senderId: 'user123',
          receiverId: 'user456',
          content: 'Hello',
          read: false,
        })
      );
    });

    it('denies creating message with different senderId', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('messages').add({
          senderId: 'other-user',
          receiverId: 'user456',
          content: 'Fake message',
        })
      );
    });

    it('allows sender to read message', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('messages').doc('msg1').get()
      );
    });

    it('allows receiver to read message', async () => {
      const db = testEnv.authenticatedContext('user456').firestore();
      await firebase.assertSucceeds(
        db.collection('messages').doc('msg1').get()
      );
    });

    it('denies non-participant from reading message', async () => {
      const db = testEnv.authenticatedContext('user789').firestore();
      await firebase.assertFails(
        db.collection('messages').doc('msg1').get()
      );
    });

    it('denies updating messages', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('messages').doc('msg1').update({
          content: 'Modified',
        })
      );
    });

    it('denies deleting messages', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('messages').doc('msg1').delete()
      );
    });
  });

  describe('Sushi Certificates Collection', () => {
    it('allows anonymous user to read certificates', async () => {
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await firebase.assertSucceeds(
        anonDb.collection('sushiCertificates').get()
      );
    });

    it('allows seller to create certificate', async () => {
      const db = testEnv.authenticatedContext('seller123').firestore();
      await firebase.assertSucceeds(
        db.collection('sushiCertificates').add({
          sellerId: 'seller123',
          certificateNumber: 'SUSHI-001',
          grade: 'A',
        })
      );
    });

    it('denies creating certificate with different sellerId', async () => {
      const db = testEnv.authenticatedContext('seller123').firestore();
      await firebase.assertFails(
        db.collection('sushiCertificates').add({
          sellerId: 'other-seller',
          certificateNumber: 'FAKE-001',
        })
      );
    });

    it('allows seller to update own certificate', async () => {
      const db = testEnv.authenticatedContext('seller123').firestore();
      await firebase.assertSucceeds(
        db.collection('sushiCertificates').doc('cert1').update({
          grade: 'S',
          sellerId: 'seller123',
        })
      );
    });

    it('denies non-seller from updating certificate', async () => {
      const db = testEnv.authenticatedContext('other-seller').firestore();
      await firebase.assertFails(
        db.collection('sushiCertificates').doc('cert1').update({
          grade: 'F',
          sellerId: 'seller123',
        })
      );
    });
  });

  describe('Transactions Collection', () => {
    it('allows authenticated user to read transactions', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertSucceeds(
        db.collection('transactions').get()
      );
    });

    it('denies creating transactions (Cloud Functions only)', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('transactions').add({
          amount: 100,
          status: 'pending',
        })
      );
    });

    it('denies updating transactions (Cloud Functions only)', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('transactions').doc('txn1').update({
          status: 'completed',
        })
      );
    });
  });

  describe('Geo Index Collection', () => {
    it('allows anonymous user to read geo index', async () => {
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await firebase.assertSucceeds(
        anonDb.collection('geoIndex').get()
      );
    });

    it('denies writing to geo index (Cloud Functions only)', async () => {
      const db = testEnv.authenticatedContext('user123').firestore();
      await firebase.assertFails(
        db.collection('geoIndex').add({
          geohash: 'abc123',
          location: { latitude: 0, longitude: 0 },
        })
      );
    });
  });

  describe('Favorites Collection', () => {
    it('allows user to create own favorite', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('favorites').add({
          buyerId: 'buyer123',
          listingId: 'listing1',
        })
      );
    });

    it('denies creating favorite for different buyer', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertFails(
        db.collection('favorites').add({
          buyerId: 'other-buyer',
          listingId: 'listing1',
        })
      );
    });

    it('allows user to read own favorites', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('favorites').doc('fav1').get()
      );
    });

    it('denies user from reading other favorites', async () => {
      const db = testEnv.authenticatedContext('other-buyer').firestore();
      await firebase.assertFails(
        db.collection('favorites').doc('fav1').get()
      );
    });

    it('allows user to delete own favorite', async () => {
      const db = testEnv.authenticatedContext('buyer123').firestore();
      await firebase.assertSucceeds(
        db.collection('favorites').doc('fav1').delete()
      );
    });
  });
});
