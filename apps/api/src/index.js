import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import ngeohash from 'ngeohash';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: process.env.FIRESTORE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
});

const db = admin.firestore();
const auth = admin.auth();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware to verify Firebase Auth token
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ========== LISTINGS API ==========

// Create listing
app.post('/api/listings', verifyAuth, async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user.uid;

    // Validate required fields
    const required = ['species', 'grade', 'quantity', 'pricePerUnit', 'location'];
    for (const field of required) {
      if (!data[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const now = admin.firestore.Timestamp.now();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const listing = {
      species: data.species.toLowerCase(),
      grade: data.grade,
      quantity: parseInt(data.quantity),
      unit: data.unit || 'lbs',
      pricePerUnit: parseFloat(data.pricePerUnit),
      freshnessDate: now,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      location: {
        ...data.location,
        geohash: ngeohash.encode(data.location.latitude, data.location.longitude, 9)
      },
      deliveryAvailable: data.deliveryAvailable || false,
      deliveryFee: data.deliveryFee || null,
      sellerId: userId,
      sellerName: req.user.name || 'Anonymous',
      photos: data.photos || [],
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    // Add sushi cert if sushi grade
    if (data.grade === 'sushi') {
      if (!data.sushiCertNumber) {
        return res.status(400).json({ error: 'Sushi certification required for sushi grade' });
      }
      listing.sushiCertNumber = data.sushiCertNumber;
      listing.sushiCertExpiry = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 48 * 60 * 60 * 1000)
      );
    }

    const docRef = await db.collection('listings').add(listing);

    // Update live inventory in RTDB
    const rtdb = admin.database();
    await rtdb.ref(`live_inventory/${docRef.id}`).set(listing.quantity);

    // Match against standing orders (async, don't wait)
    matchStandingOrders(docRef.id, listing).catch(console.error);

    res.json({
      success: true,
      listingId: docRef.id,
      message: 'Listing created successfully'
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// Get listings (with filters)
app.get('/api/listings', async (req, res) => {
  try {
    let query = db.collection('listings')
      .where('status', '==', 'active')
      .where('expiresAt', '>', admin.firestore.Timestamp.now())
      .orderBy('expiresAt', 'asc')
      .limit(100);

    const { grade, species, lat, lng, radius } = req.query;

    if (grade) {
      query = query.where('grade', '==', grade);
    }

    const snapshot = await query.get();
    let listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Client-side filtering for species and location
    if (species) {
      const speciesLower = species.toLowerCase();
      listings = listings.filter(l => l.species.includes(speciesLower));
    }

    if (lat && lng && radius) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      const radiusKm = parseFloat(radius) * 1.60934; // miles to km

      listings = listings.filter(l => {
        if (!l.location?.latitude || !l.location?.longitude) return false;
        const dist = calculateDistance(centerLat, centerLng, l.location.latitude, l.location.longitude);
        l.distance = dist / 1.60934; // store in miles
        return dist <= radiusKm;
      }).sort((a, b) => a.distance - b.distance);
    }

    res.json({ listings, count: listings.length });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Get single listing
app.get('/api/listings/:id', async (req, res) => {
  try {
    const doc = await db.collection('listings').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// ========== ORDERS API ==========

// Create order
app.post('/api/orders', verifyAuth, async (req, res) => {
  try {
    const { listingId, quantity, deliveryOption, deliveryAddress } = req.body;
    const userId = req.user.uid;

    if (!listingId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const listingRef = db.collection('listings').doc(listingId);
    const listingDoc = await listingRef.get();

    if (!listingDoc.exists) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listingDoc.data();

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available' });
    }

    if (listing.sellerId === userId) {
      return res.status(400).json({ error: 'Cannot buy your own listing' });
    }

    if (quantity > listing.quantity) {
      return res.status(400).json({ error: 'Not enough quantity available' });
    }

    const now = admin.firestore.Timestamp.now();
    const qrCode = `${listingId}-${userId}-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const order = {
      listingId,
      buyerId: userId,
      sellerId: listing.sellerId,
      quantity: parseInt(quantity),
      totalPrice: quantity * listing.pricePerUnit,
      status: 'pending',
      pickupQRCode: qrCode,
      deliveryOption: deliveryOption || 'pickup',
      deliveryAddress: deliveryAddress || null,
      createdAt: now
    };

    const orderRef = await db.collection('orders').add(order);

    // Update listing quantity
    const newQuantity = listing.quantity - quantity;
    await listingRef.update({
      quantity: newQuantity,
      status: newQuantity === 0 ? 'sold' : 'active',
      updatedAt: now
    });

    // Send notification to seller (async)
    notifySeller(listing.sellerId, 'new_order', {
      orderId: orderRef.id,
      species: listing.species,
      quantity
    }).catch(console.error);

    res.json({
      success: true,
      orderId: orderRef.id,
      pickupQRCode: qrCode
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get my orders
app.get('/api/orders/my-orders', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await db.collection('orders')
      .where('buyerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = await Promise.all(
      snapshot.docs.map(async doc => {
        const order = { id: doc.id, ...doc.data() };
        // Fetch listing details
        const listingDoc = await db.collection('listings').doc(order.listingId).get();
        if (listingDoc.exists) {
          const listing = listingDoc.data();
          order.listing = {
            species: listing.species,
            grade: listing.grade,
            photos: listing.photos || [],
            location: listing.location
          };
        }
        return order;
      })
    );

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Confirm pickup
app.post('/api/orders/:id/confirm-pickup', verifyAuth, async (req, res) => {
  try {
    const { qrCode } = req.body;
    // const _userId = req.user.uid; // TODO: Use for authorization check

    const orderRef = db.collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();

    if (order.pickupQRCode !== qrCode) {
      return res.status(403).json({ error: 'Invalid QR code' });
    }

    if (order.status === 'picked_up') {
      return res.json({ success: true, alreadyPickedUp: true });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order is cancelled' });
    }

    const now = admin.firestore.Timestamp.now();
    await orderRef.update({
      status: 'picked_up',
      pickedUpAt: now
    });

    // Notify buyer
    notifyBuyer(order.buyerId, 'order_picked_up', {
      orderId: req.params.id
    }).catch(console.error);

    res.json({ success: true, alreadyPickedUp: false });
  } catch (error) {
    console.error('Error confirming pickup:', error);
    res.status(500).json({ error: 'Failed to confirm pickup' });
  }
});

// Cancel order
app.post('/api/orders/:id/cancel', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.uid;

    const orderRef = db.collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();

    if (order.buyerId !== userId) {
      return res.status(403).json({ error: 'Only buyer can cancel' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel completed order' });
    }

    await orderRef.update({ status: 'cancelled' });

    // Restore listing quantity
    const listingRef = db.collection('listings').doc(order.listingId);
    const listingDoc = await listingRef.get();
    if (listingDoc.exists) {
      await listingRef.update({
        quantity: admin.firestore.FieldValue.increment(order.quantity),
        status: 'active'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// ========== STANDING ORDERS API ==========

app.post('/api/standing-orders', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.uid;
    const data = req.body;

    const standingOrder = {
      buyerId: userId,
      species: data.species || [],
      grades: data.grades || [],
      maxPrice: data.maxPrice || null,
      maxDistance: data.maxDistance || 25,
      minQuantity: data.minQuantity || 1,
      deliveryRequired: data.deliveryRequired || false,
      isActive: true,
      createdAt: admin.firestore.Timestamp.now()
    };

    const docRef = await db.collection('standingOrders').add(standingOrder);
    res.json({ success: true, standingOrderId: docRef.id });
  } catch (error) {
    console.error('Error creating standing order:', error);
    res.status(500).json({ error: 'Failed to create standing order' });
  }
});

app.get('/api/standing-orders', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await db.collection('standingOrders')
      .where('buyerId', '==', userId)
      .where('isActive', '==', true)
      .get();

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ standingOrders: orders });
  } catch (error) {
    console.error('Error fetching standing orders:', error);
    res.status(500).json({ error: 'Failed to fetch standing orders' });
  }
});

// ========== SCHEDULED JOBS ==========

app.post('/jobs/downgrade-sushi', async (req, res) => {
  try {
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 48 * 60 * 60 * 1000)
    );

    const snapshot = await db.collection('listings')
      .where('grade', '==', 'sushi')
      .where('createdAt', '<', cutoff)
      .where('status', '==', 'active')
      .get();

    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        grade: 'A',
        updatedAt: admin.firestore.Timestamp.now()
      });
      count++;
    });

    await batch.commit();
    console.log(`Downgraded ${count} sushi listings to grade A`);
    res.json({ success: true, downgraded: count });
  } catch (error) {
    console.error('Error downgrading sushi:', error);
    res.status(500).json({ error: 'Job failed' });
  }
});

app.post('/jobs/match-standing-orders', async (req, res) => {
  try {
    // Get active listings from last 5 minutes
    const recent = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 5 * 60 * 1000)
    );

    const listingsSnap = await db.collection('listings')
      .where('status', '==', 'active')
      .where('createdAt', '>', recent)
      .get();

    let matches = 0;

    for (const listingDoc of listingsSnap.docs) {
      const listing = { id: listingDoc.id, ...listingDoc.data() };
      const matchCount = await matchStandingOrders(listing.id, listing);
      matches += matchCount;
    }

    res.json({ success: true, matches });
  } catch (error) {
    console.error('Error matching standing orders:', error);
    res.status(500).json({ error: 'Job failed' });
  }
});

// ========== FIRESTORE TRIGGERS ==========

app.post('/triggers/listing-created', async (req, res) => {
  // Eventarc sends the document in the body
  const { documentId, data } = req.body;
  console.log('Listing created:', documentId);

  // Match against standing orders
  try {
    await matchStandingOrders(documentId, data.value.fields);
  } catch (error) {
    console.error('Error in listing created trigger:', error);
  }

  res.json({ success: true });
});

app.post('/triggers/order-created', async (req, res) => {
  const { documentId } = req.body; // data also available if needed
  console.log('Order created:', documentId);

  // Update inventory counts, analytics, etc.
  res.json({ success: true });
});

// ========== HELPER FUNCTIONS ==========

async function matchStandingOrders(listingId, listing) {
  const standingOrdersSnap = await db.collection('standingOrders')
    .where('isActive', '==', true)
    .get();

  let matches = 0;

  for (const doc of standingOrdersSnap.docs) {
    const so = doc.data();

    // Check species match
    if (so.species.length > 0 && !so.species.includes(listing.species)) {
      continue;
    }

    // Check grade match
    if (so.grades.length > 0 && !so.grades.includes(listing.grade)) {
      continue;
    }

    // Check price
    if (so.maxPrice && listing.pricePerUnit > so.maxPrice) {
      continue;
    }

    // Check distance
    if (so.maxDistance && listing.location?.latitude) {
      // Would need buyer location here - simplified for now
      continue;
    }

    // Send notification
    await notifyBuyer(so.buyerId, 'standing_order_match', {
      listingId,
      species: listing.species,
      price: listing.pricePerUnit
    });

    matches++;
  }

  return matches;
}

async function notifySeller(sellerId, type, data) {
  // Placeholder for FCM notification
  console.log('Notify seller:', sellerId, type, data);
}

async function notifyBuyer(buyerId, type, data) {
  // Placeholder for FCM notification
  console.log('Notify buyer:', buyerId, type, data);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Finventory API listening on port ${PORT}`);
});

export default app;
