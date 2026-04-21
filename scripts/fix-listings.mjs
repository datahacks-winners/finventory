import { execSync } from 'child_process';

const PROJECT_ID = 'finventory-1776558262';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

// VERIFIED WORKING UNSPLASH IMAGES FOR SEAFOOD
const IMAGES = {
  // Verified working - actual salmon
  salmon: "https://images.unsplash.com/photo-1579583630411-2239b7b676fe?w=800",
  // Verified working - fish (using for tuna)
  tuna: "https://images.unsplash.com/photo-1611171711791-b34c917fd839?w=800",
  // Verified working - shrimp (correct for prawns)
  shrimp: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800",
  // Verified working - shark
  shark: "https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=800",
  // Generic fish/seafood
  fish: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
  // Ocean waves (for flatfish)
  ocean: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800",
  // Crab - using Pexels since Unsplash URLs were wrong
  crab: "https://images.pexels.com/photos/56884/crab-carcinus-maenas-crustacean-sea-56884.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Lobster - using Pexels
  lobster: "https://images.pexels.com/photos/566345/pexels-photo-566345.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Oyster/clam - using Pexels
  oyster: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800",
  // Sea urchin/uni
  urchin: "https://images.unsplash.com/photo-1579631542720-3f8b28c51db6?w=800",
};

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
    grade: "A",
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
    photos: [IMAGES.salmon],
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
    photos: [IMAGES.crab],
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
    photos: [IMAGES.fish, IMAGES.ocean],
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
    photos: [IMAGES.tuna, IMAGES.fish],
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
    photos: [IMAGES.oyster],
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
    photos: [IMAGES.shrimp],
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
    photos: [IMAGES.fish],
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
    photos: [IMAGES.crab],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

console.log("🔄 Updating listings with CORRECT seafood images...\n");

for (const listing of listings) {
  try {
    await updateDocument('listings', listing.id, listing);
    console.log(`  ✓ Updated: ${listing.title} (${listing.species})`);
  } catch (err) {
    console.log(`  ✗ ${listing.title}: ${err.message}`);
  }
}

console.log("\n✅ Done! Images fixed:");
console.log("  - Dungeness Crab: Now uses actual crab image (Pexels)");
console.log("  - Red King Crab: Now uses actual crab image (Pexels)");
console.log("  - Spot Prawns: Uses shrimp image (correct)");
console.log("  - Oysters: Uses oyster image (Pexels)");
console.log("  - Salmon/Tuna: Verified correct Unsplash images");
console.log("\n🔄 Refresh the marketplace to see the corrected images.");
