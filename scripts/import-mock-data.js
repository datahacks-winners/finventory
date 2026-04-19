const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importData() {
  const data = JSON.parse(fs.readFileSync('./mock-data.json', 'utf8'));
  
  // Import users
  for (const user of data.users) {
    await db.collection('users').doc(user.id).set(user);
  }
  console.log(`Imported ${data.users.length} users`);
  
  // Import listings
  for (const listing of data.listings) {
    await db.collection('listings').doc(listing.id).set(listing);
  }
  console.log(`Imported ${data.listings.length} listings`);
  
  // Import orders
  for (const order of data.orders) {
    await db.collection('orders').doc(order.id).set(order);
  }
  console.log(`Imported ${data.orders.length} orders`);
  
  // Import standing orders
  for (const so of data.standingOrders) {
    await db.collection('standingOrders').doc(so.id).set(so);
  }
  console.log(`Imported ${data.standingOrders.length} standing orders`);
  
  console.log('\n✅ All data imported successfully!');
  process.exit(0);
}

importData().catch(console.error);
