#!/usr/bin/env node
/**
 * Import mock data to Firebase Firestore Emulator
 * Uses the REST API directly to bypass rules
 */

const fs = require('fs');
const http = require('http');

const PROJECT_ID = 'finventory-1776558252';
const EMULATOR_HOST = 'localhost';
const FIRESTORE_PORT = 8080;

// Read mock data
const data = JSON.parse(fs.readFileSync('./mock-data.json', 'utf8'));

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: EMULATOR_HOST,
      port: FIRESTORE_PORT,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer owner' // Emulator bypass token
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Convert value to Firestore format
function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  } else if (typeof value === 'boolean') {
    return { booleanValue: value };
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: value.toString() };
    } else {
      return { doubleValue: value };
    }
  } else if (typeof value === 'string') {
    // Check if it's a date string
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return { timestampValue: value };
    }
    return { stringValue: value };
  } else if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    };
  } else if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

async function importCollection(name, documents) {
  console.log(`\n📥 Importing ${documents.length} ${name}...`);
  let success = 0;
  let errors = 0;

  for (const doc of documents) {
    try {
      const docId = doc.id;
      const fields = {};
      
      for (const [key, value] of Object.entries(doc)) {
        if (key === 'id') continue;
        fields[key] = toFirestoreValue(value);
      }

      await makeRequest(`/${name}/${docId}`, 'PATCH', { fields });
      success++;
      process.stdout.write('.');
    } catch (err) {
      errors++;
      process.stdout.write('x');
    }
  }

  console.log(`\n  ✅ ${success} imported, ${errors} errors`);
}

async function main() {
  console.log('🌱 Importing mock data to Firebase Emulator...');
  
  try {
    await importCollection('users', data.users);
    await importCollection('listings', data.listings);
    await importCollection('orders', data.orders);
    await importCollection('standingOrders', data.standingOrders);
    
    console.log('\n🎉 Import complete!');
    console.log(`\nView data at: http://localhost:4000/firestore`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Import failed:', err.message);
    process.exit(1);
  }
}

main();
