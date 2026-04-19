import { execSync } from 'child_process';

const PROJECT_ID = 'finventory-1776558252';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Get access token from gcloud
function getAccessToken() {
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error("Failed to get access token. Run: gcloud auth application-default login");
    throw e;
  }
}

const accessToken = getAccessToken();

// Helper to convert JS value to Firestore Value format
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

// Create document
async function createDocument(collection, docId, data) {
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

// Sample data
const users = [
  {
    uid: "vendor-pacific-catch",
    email: "pacific@catch.com",
    displayName: "Pacific Catch Seafood",
    photoURL: "https://ui-avatars.com/api/?name=Pacific+Catch&background=0D8ABC&color=fff",
    phoneNumber: "+1-415-555-0100",
    isVendor: true,
    businessName: "Pacific Catch Seafood Co.",
    businessAddress: {
      street: "123 Fisherman's Wharf",
      city: "San Francisco",
      state: "CA",
      zip: "94133",
      lat: 37.8080,
      lng: -122.4177
    },
    rating: 4.8,
    totalSales: 127,
    createdAt: new Date()
  },
  {
    uid: "vendor-ocean-fresh",
    email: "ocean@fresh.com",
    displayName: "Ocean Fresh Market",
    photoURL: "https://ui-avatars.com/api/?name=Ocean+Fresh&background=27AE60&color=fff",
    phoneNumber: "+1-206-555-0200",
    isVendor: true,
    businessName: "Ocean Fresh Market",
    businessAddress: {
      street: "456 Pier 55",
      city: "Seattle",
      state: "WA",
      zip: "98101",
      lat: 47.6046,
      lng: -122.3388
    },
    rating: 4.6,
    totalSales: 89,
    createdAt: new Date()
  },
  {
    uid: "buyer-sushi-master",
    email: "sushi@master.com",
    displayName: "Sushi Master Restaurant",
    photoURL: "https://ui-avatars.com/api/?name=Sushi+Master&background=E74C3C&color=fff",
    phoneNumber: "+1-415-555-0300",
    isVendor: false,
    isBuyer: true,
    businessName: "Sushi Master Restaurant",
    businessAddress: {
      street: "789 Mission St",
      city: "San Francisco",
      state: "CA",
      zip: "94103",
      lat: 37.7858,
      lng: -122.4064
    },
    savedPaymentMethods: ["card_1"],
    createdAt: new Date()
  },
  {
    uid: "buyer-fish-co",
    email: "fish@co.com",
    displayName: "City Fish Company",
    photoURL: "https://ui-avatars.com/api/?name=City+Fish&background=F39C12&color=fff",
    phoneNumber: "+1-503-555-0400",
    isVendor: false,
    isBuyer: true,
    businessName: "City Fish Company",
    businessAddress: {
      street: "321 Waterfront Ave",
      city: "Portland",
      state: "OR",
      zip: "97201",
      lat: 45.5152,
      lng: -122.6784
    },
    standingOrders: ["order_1", "order_2"],
    createdAt: new Date()
  }
];

const listings = [
  {
    id: "listing-001",
    sellerId: "vendor-pacific-catch",
    sellerName: "Pacific Catch Seafood",
    title: "Wild Alaskan Salmon - Sushi Grade",
    description: "Fresh wild-caught Alaskan salmon, flash-frozen at sea. Perfect for sashimi and sushi. Caught this morning.",
    species: "Chinook Salmon (Oncorhynchus tshawytscha)",
    grade: "sushi",
    isSushiGrade: true,
    certificationUrl: "https://storage.example.com/cert001.pdf",
    quantity: { value: 50, unit: "lbs", available: 35 },
    price: { amount: 28.50, currency: "USD", unit: "lb" },
    photos: [
      "https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=800",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"
    ],
    catchDate: new Date(Date.now() - 86400000),
    expiryDate: new Date(Date.now() + 172800000),
    location: {
      address: "123 Fisherman's Wharf, San Francisco, CA",
      lat: 37.8080,
      lng: -122.4177
    },
    deliveryOptions: ["pickup", "local_delivery"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-002",
    sellerId: "vendor-pacific-catch",
    sellerName: "Pacific Catch Seafood",
    title: "Dungeness Crab - Live",
    description: "Live Dungeness crab caught off the California coast. Sweet, tender meat. Limited supply.",
    species: "Dungeness Crab (Metacarcinus magister)",
    grade: "gradeA",
    isSushiGrade: false,
    quantity: { value: 25, unit: "crabs", available: 18 },
    price: { amount: 18.00, currency: "USD", unit: "each" },
    photos: ["https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"],
    catchDate: new Date(Date.now() - 43200000),
    expiryDate: new Date(Date.now() + 259200000),
    location: {
      address: "123 Fisherman's Wharf, San Francisco, CA",
      lat: 37.8080,
      lng: -122.4177
    },
    deliveryOptions: ["pickup"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-003",
    sellerId: "vendor-ocean-fresh",
    sellerName: "Ocean Fresh Market",
    title: "Pacific Halibut Fillets",
    description: "Fresh halibut fillets from sustainable fisheries. Firm, white flesh with mild flavor.",
    species: "Pacific Halibut (Hippoglossus stenolepis)",
    grade: "gradeA",
    isSushiGrade: false,
    quantity: { value: 30, unit: "lbs", available: 30 },
    price: { amount: 32.00, currency: "USD", unit: "lb" },
    photos: [
      "https://images.unsplash.com/photo-1615141982880-1313d06a0b17?w=800",
      "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800"
    ],
    catchDate: new Date(Date.now() - 172800000),
    expiryDate: new Date(Date.now() + 345600000),
    location: {
      address: "456 Pier 55, Seattle, WA",
      lat: 47.6046,
      lng: -122.3388
    },
    deliveryOptions: ["pickup", "local_delivery", "shipping"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-004",
    sellerId: "vendor-ocean-fresh",
    sellerName: "Ocean Fresh Market",
    title: "Ahi Tuna (Yellowfin) - Sushi Grade",
    description: "Premium sushi-grade yellowfin tuna. Deep red color, perfect texture.",
    species: "Yellowfin Tuna (Thunnus albacares)",
    grade: "sushi",
    isSushiGrade: true,
    certificationUrl: "https://storage.example.com/cert002.pdf",
    quantity: { value: 40, unit: "lbs", available: 22 },
    price: { amount: 45.00, currency: "USD", unit: "lb" },
    photos: [
      "https://images.unsplash.com/photo-1579631542720-3f8b28c51db6?w=800",
      "https://images.unsplash.com/photo-1559563362-c667ba5f5480?w=800"
    ],
    catchDate: new Date(Date.now() - 129600000),
    expiryDate: new Date(Date.now() + 86400000),
    location: {
      address: "456 Pier 55, Seattle, WA",
      lat: 47.6046,
      lng: -122.3388
    },
    deliveryOptions: ["pickup", "local_delivery"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-005",
    sellerId: "vendor-pacific-catch",
    sellerName: "Pacific Catch Seafood",
    title: "Oysters - Kumamoto",
    description: "Sweet, small Kumamoto oysters from Humboldt Bay. Perfect for raw bar or grilling.",
    species: "Kumamoto Oyster (Crassostrea sikamea)",
    grade: "gradeA",
    isSushiGrade: true,
    quantity: { value: 200, unit: "each", available: 156 },
    price: { amount: 2.50, currency: "USD", unit: "each" },
    photos: ["https://images.unsplash.com/photo-1559305289-4c31700ba9cb?w=800"],
    catchDate: new Date(Date.now() - 259200000),
    expiryDate: new Date(Date.now() + 604800000),
    location: {
      address: "123 Fisherman's Wharf, San Francisco, CA",
      lat: 37.8080,
      lng: -122.4177
    },
    deliveryOptions: ["pickup", "local_delivery"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-006",
    sellerId: "vendor-ocean-fresh",
    sellerName: "Ocean Fresh Market",
    title: "Spot Prawns - Fresh",
    description: "Live spot prawns, sweet and succulent. Best cooked same day for peak flavor.",
    species: "Spot Prawn (Pandalus platyceros)",
    grade: "gradeA",
    isSushiGrade: false,
    quantity: { value: 15, unit: "lbs", available: 8 },
    price: { amount: 38.00, currency: "USD", unit: "lb" },
    photos: ["https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"],
    catchDate: new Date(Date.now() - 21600000),
    expiryDate: new Date(Date.now() + 86400000),
    location: {
      address: "456 Pier 55, Seattle, WA",
      lat: 47.6046,
      lng: -122.3388
    },
    deliveryOptions: ["pickup"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-007",
    sellerId: "vendor-pacific-catch",
    sellerName: "Pacific Catch Seafood",
    title: "Rockfish - Grade B",
    description: "Whole rockfish, good for fish tacos or stew. Not suitable for raw consumption.",
    species: "Vermilion Rockfish (Sebastes miniatus)",
    grade: "gradeB",
    isSushiGrade: false,
    quantity: { value: 75, unit: "lbs", available: 60 },
    price: { amount: 8.50, currency: "USD", unit: "lb" },
    photos: ["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"],
    catchDate: new Date(Date.now() - 345600000),
    expiryDate: new Date(Date.now() + 172800000),
    location: {
      address: "123 Fisherman's Wharf, San Francisco, CA",
      lat: 37.8080,
      lng: -122.4177
    },
    deliveryOptions: ["pickup"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "listing-008",
    sellerId: "vendor-ocean-fresh",
    sellerName: "Ocean Fresh Market",
    title: "King Crab Legs - Cooked",
    description: "Alaskan king crab legs, pre-cooked and flash frozen. Sweet, tender meat.",
    species: "Red King Crab (Paralithodes camtschaticus)",
    grade: "gradeA",
    isSushiGrade: false,
    quantity: { value: 40, unit: "lbs", available: 40 },
    price: { amount: 52.00, currency: "USD", unit: "lb" },
    photos: ["https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"],
    catchDate: new Date(Date.now() - 604800000),
    expiryDate: new Date(Date.now() + 1209600000),
    location: {
      address: "456 Pier 55, Seattle, WA",
      lat: 47.6046,
      lng: -122.3388
    },
    deliveryOptions: ["pickup", "local_delivery", "shipping"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

console.log("\n📦 Populating Finventory Production Database\n");
console.log("=".repeat(50));
console.log(`Project: ${PROJECT_ID}`);

// Create users
console.log("\n👤 Creating users...");
for (const user of users) {
  try {
    await createDocument('users', user.uid, user);
    console.log(`  ✓ ${user.displayName} (${user.isVendor ? 'Vendor' : 'Buyer'})`);
  } catch (err) {
    console.log(`  ✗ ${user.displayName}: ${err.message}`);
  }
}

// Create listings
console.log("\n🐟 Creating listings...");
for (const listing of listings) {
  try {
    await createDocument('listings', listing.id, listing);
    console.log(`  ✓ ${listing.title} ($${listing.price.amount}/${listing.price.unit})`);
  } catch (err) {
    console.log(`  ✗ ${listing.title}: ${err.message}`);
  }
}

console.log("\n" + "=".repeat(50));
console.log("✅ Data population complete!");
console.log(`   ${users.length} users created`);
console.log(`   ${listings.length} listings created`);
console.log(`\n🌐 Production URL: https://web-eodwatsp5q-uc.a.run.app`);
