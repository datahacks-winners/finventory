const admin = require('firebase-admin');

// Initialize with application default credentials
admin.initializeApp({
  projectId: 'finventory-1776558252'
});

const db = admin.firestore();

async function fixTimestamps() {
  console.log('Converting string dates to Firestore Timestamps...');
  
  const snapshot = await db.collection('listings').get();
  console.log(`Found ${snapshot.size} listings`);
  
  let updated = 0;
  const batch = db.batch();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const updates = {};
    
    // Check if expiresAt is a string
    if (typeof data.expiresAt === 'string') {
      updates.expiresAt = admin.firestore.Timestamp.fromDate(new Date(data.expiresAt));
      needsUpdate = true;
    }
    
    // Check other date fields
    if (typeof data.createdAt === 'string') {
      updates.createdAt = admin.firestore.Timestamp.fromDate(new Date(data.createdAt));
      needsUpdate = true;
    }
    
    if (typeof data.freshnessDate === 'string') {
      updates.freshnessDate = admin.firestore.Timestamp.fromDate(new Date(data.freshnessDate));
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      batch.update(doc.ref, updates);
      updated++;
    }
  }
  
  if (updated > 0) {
    await batch.commit();
    console.log(`Updated ${updated} listings with Firestore Timestamps`);
  } else {
    console.log('No listings needed updating');
  }
  
  process.exit(0);
}

fixTimestamps().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
