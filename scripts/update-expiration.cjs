const admin = require('firebase-admin');

// Initialize with application default credentials
admin.initializeApp({
  projectId: 'finventory-1776558252'
});

const db = admin.firestore();

async function updateListings() {
  console.log('Updating listing expiration dates...');
  
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
  const newFreshnessDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
  
  const snapshot = await db.collection('listings').get();
  console.log(`Found ${snapshot.size} listings`);
  
  let updated = 0;
  const batch = db.batch();
  
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    
    // Only update if expired
    const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
    if (expiresAt < now) {
      batch.update(doc.ref, {
        expiresAt: admin.firestore.Timestamp.fromDate(newExpiresAt),
        freshnessDate: admin.firestore.Timestamp.fromDate(newFreshnessDate),
        status: 'active'
      });
      updated++;
    }
  });
  
  if (updated > 0) {
    await batch.commit();
    console.log(`Updated ${updated} expired listings`);
    console.log(`New expiration: ${newExpiresAt.toISOString()}`);
  } else {
    console.log('No expired listings found');
  }
  
  process.exit(0);
}

updateListings().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
