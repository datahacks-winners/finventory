import { execSync } from 'child_process';

const PROJECT_ID = 'finventory-1776558252';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [key, val] of Object.entries(value)) {
      fields[key] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

async function updateDocument(collection, docId, data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  
  const url = `${BASE_URL}/${collection}/${docId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return await response.json();
}

const listings = [
  {
    id: "listing-001",
    sellerId: "vendor-pacific-catch",
    sellerName: "Pacific Catch Seafood",
    species: "Chinook Salmon",
    grade: "A",  // Changed from 'sushi' to 'A' since app expects 'A' or 'B'
    title: "Wild Alaskan Salmon - Sushi Grade",
    quantity: 50,
    unit: "lbs",
    pricePerUnit: 28.50,
    freshnessDate: new Date(Date.now() - 86400000),
    expiresAt: new Date(Date.now() + 172800000),
    location: {
      address: "123 Fisherman's Wharf, San Francisco, CA",
      latitude: 37.8080,
      longitude: -122.4177
    },
    deliveryAvailable: true,
    deliveryFee: 5.00,
    photos: [
      "https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=800",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"
    ],
    status: "active",
    sushiCertNumber: "SUSHI-001",
    sushiCertExpiry: new Date(Date.now() + 7776000000),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-002",
    sellerId: "vendor-pacific-catch",
    sellerName: "Pacific Catch Seafood",
    species: "Dungeness Crab",
    grade: "A",
    title: "Dungeness Crab - Live",
    quantity: 25,
    unit: "crabs",
    pricePerUnit: 18.00,
    freshnessDate: new Date(Date.now() - 43200000),
    expiresAt: new Date(Date.now() + 259200000),
    location: {
      address: "123 Fisherman's Wharf, San Francisco, CA",
      latitude: 37.8080,
      longitude: -122.4177
    },
    deliveryAvailable: false,
    photos: ["https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-003",
    sellerId: "vendor-ocean-fresh",
    sellerName: "Ocean Fresh Market",
    species: "Pacific Halibut",
    grade: "A",
    title: "Pacific Halibut Fillets",
    quantity: 30,
    unit: "lbs",
    pricePerUnit: 32.00,
    freshnessDate: new Date(Date.now() - 172800000),
    expiresAt: new Date(Date.now() + 345600000),
    location: {
      address: "456 Pier 55, Seattle, WA",
      latitude: 47.6046,
      longitude: -122.3388
    },
    deliveryAvailable: true,
    deliveryFee: 8.00,
    photos: [
      "https://images.unsplash.com/photo-1615141982880-1313d06a0b17?w=800",
      "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800"
    ],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-004",
    sellerId: "vendor-ocean-fresh",
    sellerName: "Ocean Fresh Market",
    species: "Yellowfin Tuna",
    grade: "A",
    title: "Ahi Tuna - Sushi Grade",
    quantity: 40,
    unit: "lbs",
    pricePerUnit: 45.00,
    freshnessDate: new Date(Date.now() - 129600000),
    expiresAt: new Date(Date.now() + 86400000),
    location: {
      address: "456 Pier 55, Seattle, WA",
      latitude: 47.6046,
      longitude: -122.3388
    },
    deliveryAvailable: true,
    deliveryFee: 10.00,
    photos: [
      "https://images.unsplash.com/photo-1579631542720-3f8b28c51db6?w=800",
      "https://images.unsplash.com/photo-1559563362-c667ba5f5480?w=800"
    ],
    status: "active",
    sushiCertNumber: "SUSHI-002",
    sushiCertExpiry: new Date(Date.now() + 5184000000),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-005",
    sellerId: "vendor-pacific-catch",
    sellerName: "Pacific Catch Seafood",
    species: "Kumamoto Oyster",
    grade: "A",
    title: "Oysters - Kumamoto",
    quantity: 200,
    unit: "each",
    pricePerUnit: 2.50,
    freshnessDate: new Date(Date.now() - 259200000),
    expiresAt: new Date(Date.now() + 604800000),
    location: {
      address: "123 Fisherman's Wharf, San Francisco, CA",
      latitude: 37.8080,
      longitude: -122.4177
    },
    deliveryAvailable: true,
    deliveryFee: 3.00,
    photos: ["https://images.unsplash.com/photo-1559305289-4c31700ba9cb?w=800"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-006",
    sellerId: "vendor-ocean-fresh",
    sellerName: "Ocean Fresh Market",
    species: "Spot Prawn",
    grade: "A",
    title: "Spot Prawns - Fresh",
    quantity: 15,
    unit: "lbs",
    pricePerUnit: 38.00,
    freshnessDate: new Date(Date.now() - 21600000),
    expiresAt: new Date(Date.now() + 86400000),
    location: {
      address: "456 Pier 55, Seattle, WA",
      latitude: 47.6046,
      longitude: -122.3388
    },
    deliveryAvailable: false,
    photos: ["https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-007",
    sellerId: "vendor-pacific-catch",
    sellerName: "Pacific Catch Seafood",
    species: "Vermilion Rockfish",
    grade: "B",
    title: "Rockfish - Grade B",
    quantity: 75,
    unit: "lbs",
    pricePerUnit: 8.50,
    freshnessDate: new Date(Date.now() - 345600000),
    expiresAt: new Date(Date.now() + 172800000),
    location: {
      address: "123 Fisherman's Wharf, San Francisco, CA",
      latitude: 37.8080,
      longitude: -122.4177
    },
    deliveryAvailable: false,
    photos: ["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-008",
    sellerId: "vendor-ocean-fresh",
    sellerName: "Ocean Fresh Market",
    species: "Red King Crab",
    grade: "A",
    title: "King Crab Legs - Cooked",
    quantity: 40,
    unit: "lbs",
    pricePerUnit: 52.00,
    freshnessDate: new Date(Date.now() - 604800000),
    expiresAt: new Date(Date.now() + 1209600000),
    location: {
      address: "456 Pier 55, Seattle, WA",
      latitude: 47.6046,
      longitude: -122.3388
    },
    deliveryAvailable: true,
    deliveryFee: 15.00,
    photos: ["https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

console.log("🔄 Updating listings with correct schema...\n");

for (const listing of listings) {
  try {
    await updateDocument('listings', listing.id, listing);
    console.log(`  ✓ Updated: ${listing.title}`);
  } catch (err) {
    console.log(`  ✗ ${listing.title}: ${err.message}`);
  }
}

console.log("\n✅ Done! Refresh the marketplace to see the listings.");
