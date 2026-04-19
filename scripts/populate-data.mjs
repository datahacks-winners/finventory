// Firestore data population script
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Sample data for Finventory
const sampleData = {
  users: [
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
  ],
  listings: [
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
      quantity: {
        value: 50,
        unit: "lbs",
        available: 35
      },
      price: {
        amount: 28.50,
        currency: "USD",
        unit: "lb"
      },
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
      quantity: {
        value: 25,
        unit: "crabs",
        available: 18
      },
      price: {
        amount: 18.00,
        currency: "USD",
        unit: "each"
      },
      photos: [
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"
      ],
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
      description: "Fresh halibut fillets from sustainable fisheries. Firm, white flesh with mild flavor. Great for grilling or pan-searing.",
      species: "Pacific Halibut (Hippoglossus stenolepis)",
      grade: "gradeA",
      isSushiGrade: false,
      quantity: {
        value: 30,
        unit: "lbs",
        available: 30
      },
      price: {
        amount: 32.00,
        currency: "USD",
        unit: "lb"
      },
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
      description: "Premium sushi-grade yellowfin tuna. Deep red color, perfect texture. Flash frozen to preserve freshness.",
      species: "Yellowfin Tuna (Thunnus albacares)",
      grade: "sushi",
      isSushiGrade: true,
      certificationUrl: "https://storage.example.com/cert002.pdf",
      quantity: {
        value: 40,
        unit: "lbs",
        available: 22
      },
      price: {
        amount: 45.00,
        currency: "USD",
        unit: "lb"
      },
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
      quantity: {
        value: 200,
        unit: "each",
        available: 156
      },
      price: {
        amount: 2.50,
        currency: "USD",
        unit: "each"
      },
      photos: [
        "https://images.unsplash.com/photo-1559305289-4c31700ba9cb?w=800"
      ],
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
      quantity: {
        value: 15,
        unit: "lbs",
        available: 8
      },
      price: {
        amount: 38.00,
        currency: "USD",
        unit: "lb"
      },
      photos: [
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"
      ],
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
      quantity: {
        value: 75,
        unit: "lbs",
        available: 60
      },
      price: {
        amount: 8.50,
        currency: "USD",
        unit: "lb"
      },
      photos: [
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"
      ],
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
      quantity: {
        value: 40,
        unit: "lbs",
        available: 40
      },
      price: {
        amount: 52.00,
        currency: "USD",
        unit: "lb"
      },
      photos: [
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"
      ],
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
  ]
};

async function populateData() {
  try {
    // Get service account from 1Password or environment
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let serviceAccount;
    
    if (serviceAccountPath) {
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    } else {
      // Fallback - try to use ADC
      console.log("Using Application Default Credentials...");
    }
    
    // Initialize Firebase Admin
    const app = initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : undefined,
      projectId: 'finventory-1776558252'
    });
    
    const db = getFirestore(app);
    
    console.log("\n📦 Populating Finventory Production Database\n");
    console.log("=".repeat(50));
    
    // Create users
    console.log("\n👤 Creating users...");
    for (const user of sampleData.users) {
      await db.collection('users').doc(user.uid).set(user);
      console.log(`  ✓ User: ${user.displayName} (${user.isVendor ? 'Vendor' : 'Buyer'})`);
    }
    
    // Create listings
    console.log("\n🐟 Creating listings...");
    for (const listing of sampleData.listings) {
      await db.collection('listings').doc(listing.id).set(listing);
      console.log(`  ✓ ${listing.title} - $${listing.price.amount}/${listing.price.unit}`);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("✅ Data population complete!");
    console.log(`   ${sampleData.users.length} users created`);
    console.log(`   ${sampleData.listings.length} listings created`);
    
  } catch (error) {
    console.error("\n❌ Error populating data:", error.message);
    console.log("\nMake sure you have:");
    console.log("1. Firebase Admin SDK credentials, or");
    console.log("2. gcloud auth application-default login configured");
    process.exit(1);
  }
}

// Run the population
populateData();
