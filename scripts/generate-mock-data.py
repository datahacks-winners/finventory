#!/usr/bin/env python3
"""
Generate synthetic mock data for Finventory marketplace
Uses Faker to create realistic seafood marketplace data
"""

import json
import random
from datetime import datetime, timedelta
from faker import Faker
from faker.providers import geo
import uuid

fake = Faker()
fake.add_provider(geo)

# San Diego coastal area for realistic locations
SAN_DIEGO_BOUNDS = {
    'lat_min': 32.5,
    'lat_max': 33.2,
    'lng_min': -117.3,
    'lng_max': -116.8
}

# Seafood species commonly found in SoCal
SEAFOOD_SPECIES = [
    'Pacific Bluefin Tuna', 'Yellowfin Tuna', 'Bigeye Tuna', 'Albacore',
    'California Yellowtail', 'Yellowtail Amberjack', 'Pacific Halibut',
    'California Halibut', 'Rockfish', 'Lingcod', 'Sea Bass', 'White Sea Bass',
    'Swordfish', 'Mahi Mahi', 'Pacific Salmon', 'Chinook Salmon', 'Coho Salmon',
    'Sardines', 'Anchovies', 'Mackerel', 'Bonito', 'Squid', 'Dungeness Crab',
    'Spiny Lobster', 'California Spot Prawn', 'Pacific Oyster', 'Mussels',
    'Clams', 'Scallops', 'Uni', 'Abalone'
]

# Business names for seafood sellers
SELLER_BUSINESSES = [
    'San Diego Seafood Co.', 'Pacific Fish Market', 'Harbor Bay Fisheries',
    'Ocean Catch Wholesale', 'Seaside Market', 'Dockside Fresh Fish',
    'Coastal Harvest', 'Blue Ocean Seafood', 'Sunset Harbor Fish',
    'Del Mar Seafood', 'Coronado Catch', 'La Jolla Fish Market',
    'Point Loma Seafood', 'Mission Bay Fish Co.', 'Imperial Beach Seafood',
    'Tuna Harbor Dockside', 'Catalina Offshore Products', 'Baja Seafood Direct'
]

# Restaurant/catering buyer names
BUYER_BUSINESSES = [
    'The Fish Market Restaurant', 'Eddie V\'s Prime Seafood', 'Water Grill SD',
    'Ironside Fish & Oyster', 'Kingfisher', 'The Joint',
    'Sushi Ota', 'Nobu San Diego', 'Sushi Tadokoro',
    'Coasterra', 'Tom Ham\'s Lighthouse', 'Mitch\'s Seafood',
    'Bali Hai Restaurant', 'Island Prime', 'C Level',
    'Gardein Catering', 'True Food Kitchen', 'Coastal Kitchen Catering',
    'Seaside Bistro', 'Ocean View Cafe', 'Harbor House Cafe',
    'Pacific Beach Fish Shop', 'Blue Water Seafood', 'El Pescador'
]

# Storage methods
STORAGE_METHODS = ['ice', 'refrigerated', 'frozen', 'live_tank']

# Grades
GRADES = ['sushi', 'A', 'B', 'C']

# Unit types
UNITS = ['lb', 'kg']

# Photo URLs (placeholder images for mock data)
PHOTO_URLS = [
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400',
    'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
    'https://images.unsplash.com/photo-1534489719178-455e6f15f547?w=400',
    'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
    'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=400',
    'https://images.unsplash.com/photo-1599321955726-90481c1d4292?w=400'
]

def random_location():
    """Generate random location in San Diego area"""
    return {
        'latitude': round(random.uniform(SAN_DIEGO_BOUNDS['lat_min'], SAN_DIEGO_BOUNDS['lat_max']), 6),
        'longitude': round(random.uniform(SAN_DIEGO_BOUNDS['lng_min'], SAN_DIEGO_BOUNDS['lng_max']), 6)
    }

def generate_seller(index):
    """Generate a seller (fishery/business)"""
    business_name = SELLER_BUSINESSES[index % len(SELLER_BUSINESSES)]
    if index >= len(SELLER_BUSINESSES):
        business_name += f" #{index // len(SELLER_BUSINESSES) + 1}"
    
    loc = random_location()
    
    return {
        'id': str(uuid.uuid4()),
        'email': f'seller{index}@finventory.com',
        'phone': fake.phone_number(),
        'business_name': business_name,
        'business_license': f'LIC-{random.randint(10000, 99999)}',
        'type': 'seller',
        'location': loc,
        'address': fake.address().replace('\n', ', '),
        'rating': round(random.uniform(3.5, 5.0), 1),
        'verified_status': random.choice([True, True, True, False]),  # 75% verified
        'created_at': fake.date_time_between(start_date='-2y', end_date='now').isoformat(),
        'sellerProfile': {
            'businessName': business_name,
            'description': f'Fresh {random.choice(SEAFOOD_SPECIES)} and more, direct from the dock.',
            'certifications': [
                {
                    'type': random.choice(['HACCP', 'MSC', 'ASC', 'SQF']),
                    'number': f'CERT-{random.randint(1000, 9999)}',
                    'expiryDate': (datetime.now() + timedelta(days=random.randint(100, 500))).isoformat(),
                    'verified': True
                }
            ] if random.random() > 0.3 else [],
            'location': loc,
            'rating': round(random.uniform(3.5, 5.0), 1)
        }
    }

def generate_buyer(index):
    """Generate a buyer (restaurant/catering)"""
    business_name = BUYER_BUSINESSES[index % len(BUYER_BUSINESSES)]
    if index >= len(BUYER_BUSINESSES):
        business_name += f" #{index // len(BUYER_BUSINESSES) + 1}"
    
    loc = random_location()
    
    return {
        'id': str(uuid.uuid4()),
        'email': f'buyer{index}@finventory.com',
        'phone': fake.phone_number(),
        'business_name': business_name,
        'business_license': f'LIC-{random.randint(10000, 99999)}',
        'type': 'buyer',
        'location': loc,
        'address': fake.address().replace('\n', ', '),
        'rating': round(random.uniform(4.0, 5.0), 1),
        'verified_status': random.choice([True, True, True, False]),
        'created_at': fake.date_time_between(start_date='-1y', end_date='now').isoformat(),
        'buyerProfile': {
            'deliveryAddresses': [
                {
                    'label': 'Main Location',
                    'street': fake.street_address(),
                    'city': 'San Diego',
                    'state': 'CA',
                    'zip': fake.zipcode_in_state('CA'),
                    'isDefault': True
                }
            ]
        }
    }

def generate_listing(seller_id, index):
    """Generate a seafood listing"""
    species = random.choice(SEAFOOD_SPECIES)
    grade = random.choice(GRADES)
    quantity = round(random.uniform(5, 500), 1)  # 5-500 lbs
    price_per_lb = round(random.uniform(2, 45), 2)  # $2-45/lb depending on species
    
    # Adjust price by grade
    if grade == 'sushi':
        price_per_lb = round(price_per_lb * 1.5, 2)
    elif grade == 'A':
        price_per_lb = round(price_per_lb * 1.2, 2)
    elif grade == 'C':
        price_per_lb = round(price_per_lb * 0.7, 2)
    
    # Catch date (today or yesterday for freshness)
    catch_date = fake.date_time_between(start_date='-2d', end_date='now')
    landing_date = catch_date
    
    # Expires in 3-7 days
    expires_at = datetime.now() + timedelta(days=random.randint(3, 7))
    
    listing = {
        'id': str(uuid.uuid4()),
        'sellerId': seller_id,
        'species': species.lower(),
        'grade': grade,
        'quantity': quantity,
        'unit': 'lb',
        'pricePerUnit': price_per_lb,
        'totalPrice': round(quantity * price_per_lb, 2),
        'location': random_location(),
        'photos': random.sample(PHOTO_URLS, k=random.randint(1, 3)),
        'freshnessDate': catch_date.isoformat(),
        'catchDate': catch_date.isoformat(),
        'landingDate': landing_date.isoformat(),
        'storageMethod': random.choice(STORAGE_METHODS),
        'storageTempCelsius': random.choice([0, 1, 2, -1, -18]) if random.random() > 0.5 else None,
        'deliveryAvailable': random.choice([True, False]),
        'status': 'active',
        'createdAt': datetime.now().isoformat(),
        'expiresAt': expires_at.isoformat(),
        'description': f'Fresh {species} caught this morning. {grade} grade quality perfect for {random.choice(["sashimi", "grilling", "frying", "soup", "ceviche"])}.',
        'shipping': {
            'available': random.choice([True, False]),
            'regions': random.sample(['local', 'regional', 'national'], k=random.randint(1, 3)),
            'handlingDays': random.randint(0, 1),
            'preferredCarriers': random.sample(['fedex', 'ups'], k=random.randint(1, 2)),
            'hasColdShippingMaterials': True
        } if random.choice([True, False]) else None
    }
    
    # Add sushi-specific fields if applicable
    if grade == 'sushi':
        listing['sushiCertified'] = True
        listing['certificationType'] = random.choice(['flash_frozen', 'lab_tested', 'farm_raised'])
        listing['certificationProofUrl'] = random.choice(PHOTO_URLS)
        listing['frozenDate'] = (catch_date - timedelta(days=random.randint(7, 30))).isoformat()
        if random.random() > 0.5:
            listing['thawedDate'] = catch_date.isoformat()
        listing['gradeExpiresAt'] = (datetime.now() + timedelta(hours=48)).isoformat()
    
    return listing

def generate_order(buyer_id, listing_id, seller_id):
    """Generate an order"""
    quantity = round(random.uniform(5, 50), 1)
    price_per_lb = round(random.uniform(5, 40), 2)
    subtotal = round(quantity * price_per_lb, 2)
    platform_fee = round(subtotal * 0.02, 2)  # 2% fee
    shipping_cost = round(random.uniform(15, 50), 2) if random.choice([True, False]) else 0
    total = round(subtotal + platform_fee + shipping_cost, 2)
    
    return {
        'id': str(uuid.uuid4()),
        'listingId': listing_id,
        'buyerId': buyer_id,
        'sellerId': seller_id,
        'quantity': quantity,
        'subtotal': subtotal,
        'platformFee': platform_fee,
        'shippingCost': shipping_cost,
        'totalPrice': total,
        'status': random.choice(['pending', 'picked_up', 'shipped', 'delivered']),
        'fulfillmentType': random.choice(['pickup', 'shipping']),
        'qrCode': f'FR-{random.randint(10000, 99999)}' if random.choice([True, False]) else None,
        'pickupTime': fake.date_time_between(start_date='now', end_date='+3d').isoformat(),
        'createdAt': fake.date_time_between(start_date='-7d', end_date='now').isoformat(),
        'pickedUpAt': fake.date_time_between(start_date='now', end_date='+1d').isoformat() if random.random() > 0.5 else None,
        'shippingAddress': {
            'businessName': 'Test Restaurant',
            'contactName': fake.name(),
            'street': fake.street_address(),
            'city': 'San Diego',
            'state': 'CA',
            'zip': fake.zipcode_in_state('CA'),
            'phone': fake.phone_number()
        } if random.choice([True, False]) else None
    }

def generate_standing_order(buyer_id):
    """Generate a standing order (recurring order criteria)"""
    return {
        'id': str(uuid.uuid4()),
        'buyerId': buyer_id,
        'name': f'{random.choice(["Daily", "Weekly"])} {random.choice(["White Fish", "Tuna", "Salmon", "Shellfish"])}',
        'species': random.sample([s.lower() for s in SEAFOOD_SPECIES], k=random.randint(1, 5)),
        'minGrade': random.choice(['A', 'B', 'sushi']),
        'maxPricePerUnit': round(random.uniform(10, 35), 2),
        'location': random_location(),
        'maxDistance': random.choice([10, 25, 50, 100]),
        'quantityPerOrder': round(random.uniform(10, 100), 1),
        'frequency': random.choice(['daily', 'weekly']),
        'isActive': random.choice([True, True, True, False]),
        'includeSushiGrade': random.choice([True, False]),
        'createdAt': fake.date_time_between(start_date='-3m', end_date='now').isoformat(),
        'lastMatchedAt': fake.date_time_between(start_date='-1w', end_date='now').isoformat() if random.random() > 0.3 else None
    }

def main():
    """Generate all mock data"""
    print("🐟 Generating Finventory mock data...")
    
    # Configuration
    NUM_SELLERS = 15
    NUM_BUYERS = 20
    LISTINGS_PER_SELLER = (8, 25)  # Min, max listings per seller
    ORDERS_PER_BUYER = (3, 15)  # Min, max orders per buyer
    STANDING_ORDERS_PER_BUYER = (0, 3)  # Min, max standing orders per buyer
    
    data = {
        'users': [],
        'listings': [],
        'orders': [],
        'standingOrders': []
    }
    
    # Generate sellers
    print(f"  Creating {NUM_SELLERS} sellers...")
    sellers = [generate_seller(i) for i in range(NUM_SELLERS)]
    data['users'].extend(sellers)
    seller_ids = [s['id'] for s in sellers]
    
    # Generate buyers
    print(f"  Creating {NUM_BUYERS} buyers...")
    buyers = [generate_buyer(i) for i in range(NUM_BUYERS)]
    data['users'].extend(buyers)
    buyer_ids = [b['id'] for b in buyers]
    
    # Generate listings for each seller
    print("  Creating listings...")
    for seller_id in seller_ids:
        num_listings = random.randint(*LISTINGS_PER_SELLER)
        for i in range(num_listings):
            listing = generate_listing(seller_id, i)
            data['listings'].append(listing)
    
    listing_ids = [l['id'] for l in data['listings']]
    
    # Generate orders
    print("  Creating orders...")
    for buyer_id in buyer_ids:
        num_orders = random.randint(*ORDERS_PER_BUYER)
        for _ in range(num_orders):
            listing_id = random.choice(listing_ids)
            # Find seller for this listing
            listing = next(l for l in data['listings'] if l['id'] == listing_id)
            seller_id = listing['sellerId']
            order = generate_order(buyer_id, listing_id, seller_id)
            data['orders'].append(order)
    
    # Generate standing orders
    print("  Creating standing orders...")
    for buyer_id in buyer_ids:
        num_standing = random.randint(*STANDING_ORDERS_PER_BUYER)
        for _ in range(num_standing):
            standing_order = generate_standing_order(buyer_id)
            data['standingOrders'].append(standing_order)
    
    # Save to JSON file
    output_path = '/home/justin-lo/code/finventory/scripts/mock-data.json'
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✅ Generated mock data:")
    print(f"   Sellers: {len(sellers)}")
    print(f"   Buyers: {len(buyers)}")
    print(f"   Listings: {len(data['listings'])}")
    print(f"   Orders: {len(data['orders'])}")
    print(f"   Standing Orders: {len(data['standingOrders'])}")
    print(f"\n💾 Saved to: {output_path}")
    
    # Also generate Firebase import script
    generate_import_script(data)


def generate_import_script(data):
    """Generate a Node.js script to import data into Firebase"""
    script = '''const admin = require('firebase-admin');
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
  
  console.log('\\n✅ All data imported successfully!');
  process.exit(0);
}

importData().catch(console.error);
'''
    
    script_path = '/home/justin-lo/code/finventory/scripts/import-mock-data.js'
    with open(script_path, 'w') as f:
        f.write(script)
    
    print(f"\n📤 Import script saved to: {script_path}")
    print("\nTo import to Firebase:")
    print("  1. Download your serviceAccountKey.json from Firebase Console")
    print("  2. Run: node scripts/import-mock-data.js")


if __name__ == '__main__':
    main()
