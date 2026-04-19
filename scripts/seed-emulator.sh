#!/bin/bash
# Seed Firebase emulator with mock data
# Usage: ./seed-emulator.sh

echo "🌱 Seeding Firebase emulator with mock data..."

# Check if emulator is running
if ! curl -s http://localhost:8080 2>/dev/null | grep -q "Firestore"; then
  echo "❌ Firestore emulator not running on port 8080"
  echo "   Start it with: npm run dev:firebase"
  exit 1
fi

echo "✅ Firestore emulator detected"

# Import using curl
cd "$(dirname "$0")"

PROJECT_ID="finventory-1776558252"
EMULATOR_URL="http://localhost:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents"

echo "📥 Importing collections..."

# Function to import a collection
import_collection() {
  local collection=$1
  local file=$2
  
  echo "  Importing $collection..."
  
  node -e "
    const fs = require('fs');
    const http = require('http');
    
    const data = JSON.parse(fs.readFileSync('$file', 'utf8'));
    const docs = data['$collection'] || [];
    
    let completed = 0;
    let errors = 0;
    
    docs.forEach(doc => {
      const docId = doc.id;
      // Convert dates to Firestore timestamps
      const firestoreDoc = { fields: {} };
      
      for (const [key, value] of Object.entries(doc)) {
        if (key === 'id') continue;
        
        if (value === null || value === undefined) {
          firestoreDoc.fields[key] = { nullValue: null };
        } else if (typeof value === 'boolean') {
          firestoreDoc.fields[key] = { booleanValue: value };
        } else if (typeof value === 'number') {
          firestoreDoc.fields[key] = { doubleValue: value };
        } else if (typeof value === 'string') {
          firestoreDoc.fields[key] = { stringValue: value };
        } else if (Array.isArray(value)) {
          firestoreDoc.fields[key] = { 
            arrayValue: { 
              values: value.map(v => ({ stringValue: String(v) })) 
            } 
          };
        } else if (typeof value === 'object') {
          firestoreDoc.fields[key] = { 
            mapValue: { fields: {} } 
          };
          for (const [k, v] of Object.entries(value)) {
            firestoreDoc.fields[key].mapValue.fields[k] = { stringValue: String(v) };
          }
        }
      }
      
      const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/v1/projects/finventory-1776558252/databases/(default)/documents/$collection/' + docId,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          completed++;
        } else {
          errors++;
        }
        if (completed + errors === docs.length) {
          console.log('    ✅ ' + completed + ' ' + '$collection' + ' imported');
          if (errors > 0) {
            console.log('    ⚠️  ' + errors + ' errors');
          }
        }
      });
      
      req.on('error', () => {
        errors++;
      });
      
      req.write(JSON.stringify(firestoreDoc));
      req.end();
    });
    
    if (docs.length === 0) {
      console.log('    ℹ️  No $collection to import');
    }
  "
}

# Import all collections
import_collection "users" "mock-data.json"
import_collection "listings" "mock-data.json"
import_collection "orders" "mock-data.json"
import_collection "standingOrders" "mock-data.json"

echo ""
echo "🎉 Emulator seeding complete!"
echo "   Access Firestore at: http://localhost:4000/firestore"
