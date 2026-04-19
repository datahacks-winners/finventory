# Seed data for production environment using null_resource with gcloud
# Creates sample users and listings for demonstration

locals {
  seed_data_json = jsonencode({
    users = {
      "vendor-pacific-catch" = {
        email        = "pacific@catch.com"
        displayName  = "Pacific Catch Seafood"
        photoURL     = "https://ui-avatars.com/api/?name=Pacific+Catch&background=0D8ABC&color=fff"
        phoneNumber  = "+1-415-555-0100"
        isVendor     = true
        businessName = "Pacific Catch Seafood Co."
        businessAddress = {
          street = "123 Fisherman's Wharf"
          city   = "San Francisco"
          state  = "CA"
          zip    = "94133"
          lat    = 37.8080
          lng    = -122.4177
        }
        rating     = 4.8
        totalSales = 127
        createdAt  = "2026-04-19T12:00:00Z"
      }
      "vendor-ocean-fresh" = {
        email        = "ocean@fresh.com"
        displayName  = "Ocean Fresh Market"
        photoURL     = "https://ui-avatars.com/api/?name=Ocean+Fresh&background=27AE60&color=fff"
        phoneNumber  = "+1-206-555-0200"
        isVendor     = true
        businessName = "Ocean Fresh Market"
        businessAddress = {
          street = "456 Pier 55"
          city   = "Seattle"
          state  = "WA"
          zip    = "98101"
          lat    = 47.6046
          lng    = -122.3388
        }
        rating     = 4.6
        totalSales = 89
        createdAt  = "2026-04-19T12:00:00Z"
      }
      "buyer-sushi-master" = {
        email        = "sushi@master.com"
        displayName  = "Sushi Master Restaurant"
        photoURL     = "https://ui-avatars.com/api/?name=Sushi+Master&background=E74C3C&color=fff"
        phoneNumber  = "+1-415-555-0300"
        isVendor     = false
        isBuyer      = true
        businessName = "Sushi Master Restaurant"
        businessAddress = {
          street = "789 Mission St"
          city   = "San Francisco"
          state  = "CA"
          zip    = "94103"
          lat    = 37.7858
          lng    = -122.4064
        }
        createdAt = "2026-04-19T12:00:00Z"
      }
      "buyer-fish-co" = {
        email        = "fish@co.com"
        displayName  = "City Fish Company"
        photoURL     = "https://ui-avatars.com/api/?name=City+Fish&background=F39C12&color=fff"
        phoneNumber  = "+1-503-555-0400"
        isVendor     = false
        isBuyer      = true
        businessName = "City Fish Company"
        businessAddress = {
          street = "321 Waterfront Ave"
          city   = "Portland"
          state  = "OR"
          zip    = "97201"
          lat    = 45.5152
          lng    = -122.6784
        }
        createdAt = "2026-04-19T12:00:00Z"
      }
    }
    listings = {
      "listing-001" = {
        sellerId          = "vendor-pacific-catch"
        sellerName        = "Pacific Catch Seafood"
        species           = "Chinook Salmon"
        grade             = "A"
        title             = "Wild Alaskan Salmon - Sushi Grade"
        quantity          = 50
        unit              = "lbs"
        pricePerUnit      = 28.50
        freshnessDate     = "2026-04-19T10:00:00Z"
        expiresAt         = "2026-04-22T10:00:00Z"
        location = {
          address   = "123 Fisherman's Wharf, San Francisco, CA"
          latitude  = 37.8080
          longitude = -122.4177
        }
        deliveryAvailable = true
        deliveryFee       = 5.00
        photos = [
          "https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=800",
          "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"
        ]
        status           = "active"
        sushiCertNumber  = "SUSHI-001"
        sushiCertExpiry  = "2026-07-19T10:00:00Z"
        rating           = 4.8
        reviewCount      = 124
        createdAt        = "2026-04-19T12:00:00Z"
        updatedAt        = "2026-04-19T12:00:00Z"
      }
      "listing-002" = {
        sellerId          = "vendor-pacific-catch"
        sellerName        = "Pacific Catch Seafood"
        species           = "Dungeness Crab"
        grade             = "A"
        title             = "Dungeness Crab - Live"
        quantity          = 25
        unit              = "crabs"
        pricePerUnit      = 18.00
        freshnessDate     = "2026-04-19T10:00:00Z"
        expiresAt         = "2026-04-22T10:00:00Z"
        location = {
          address   = "123 Fisherman's Wharf, San Francisco, CA"
          latitude  = 37.8080
          longitude = -122.4177
        }
        deliveryAvailable = false
        photos = [
          "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"
        ]
        status           = "active"
        rating           = 4.6
        reviewCount      = 89
        createdAt        = "2026-04-19T12:00:00Z"
        updatedAt        = "2026-04-19T12:00:00Z"
      }
      "listing-003" = {
        sellerId          = "vendor-ocean-fresh"
        sellerName        = "Ocean Fresh Market"
        species           = "Pacific Halibut"
        grade             = "A"
        title             = "Pacific Halibut Fillets"
        quantity          = 30
        unit              = "lbs"
        pricePerUnit      = 32.00
        freshnessDate     = "2026-04-19T10:00:00Z"
        expiresAt         = "2026-04-23T10:00:00Z"
        location = {
          address   = "456 Pier 55, Seattle, WA"
          latitude  = 47.6046
          longitude = -122.3388
        }
        deliveryAvailable = true
        deliveryFee       = 8.00
        photos = [
          "https://images.unsplash.com/photo-1615141982880-1313d06a0b17?w=800",
          "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800"
        ]
        status           = "active"
        rating           = 4.9
        reviewCount      = 203
        createdAt        = "2026-04-19T12:00:00Z"
        updatedAt        = "2026-04-19T12:00:00Z"
      }
      "listing-004" = {
        sellerId          = "vendor-ocean-fresh"
        sellerName        = "Ocean Fresh Market"
        species           = "Yellowfin Tuna"
        grade             = "A"
        title             = "Ahi Tuna - Sushi Grade"
        quantity          = 40
        unit              = "lbs"
        pricePerUnit      = 45.00
        freshnessDate     = "2026-04-19T10:00:00Z"
        expiresAt         = "2026-04-20T10:00:00Z"
        location = {
          address   = "456 Pier 55, Seattle, WA"
          latitude  = 47.6046
          longitude = -122.3388
        }
        deliveryAvailable = true
        deliveryFee       = 10.00
        photos = [
          "https://images.unsplash.com/photo-1579631542720-3f8b28c51db6?w=800",
          "https://images.unsplash.com/photo-1559563362-c667ba5f5480?w=800"
        ]
        status            = "active"
        sushiCertNumber   = "SUSHI-002"
        sushiCertExpiry   = "2026-06-19T10:00:00Z"
        rating            = 4.7
        reviewCount       = 156
        createdAt         = "2026-04-19T12:00:00Z"
        updatedAt         = "2026-04-19T12:00:00Z"
      }
      "listing-005" = {
        sellerId          = "vendor-pacific-catch"
        sellerName        = "Pacific Catch Seafood"
        species           = "Kumamoto Oyster"
        grade             = "A"
        title             = "Oysters - Kumamoto"
        quantity          = 200
        unit              = "each"
        pricePerUnit      = 2.50
        freshnessDate     = "2026-04-19T10:00:00Z"
        expiresAt         = "2026-04-26T10:00:00Z"
        location = {
          address   = "123 Fisherman's Wharf, San Francisco, CA"
          latitude  = 37.8080
          longitude = -122.4177
        }
        deliveryAvailable = true
        deliveryFee       = 3.00
        photos = [
          "https://images.unsplash.com/photo-1559305289-4c31700ba9cb?w=800"
        ]
        status           = "active"
        rating           = 4.5
        reviewCount      = 67
        createdAt        = "2026-04-19T12:00:00Z"
        updatedAt        = "2026-04-19T12:00:00Z"
      }
      "listing-006" = {
        sellerId          = "vendor-ocean-fresh"
        sellerName        = "Ocean Fresh Market"
        species           = "Spot Prawn"
        grade             = "A"
        title             = "Spot Prawns - Fresh"
        quantity          = 15
        unit              = "lbs"
        pricePerUnit      = 38.00
        freshnessDate     = "2026-04-19T10:00:00Z"
        expiresAt         = "2026-04-20T10:00:00Z"
        location = {
          address   = "456 Pier 55, Seattle, WA"
          latitude  = 47.6046
          longitude = -122.3388
        }
        deliveryAvailable = false
        photos = [
          "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"
        ]
        status           = "active"
        rating           = 4.4
        reviewCount      = 45
        createdAt        = "2026-04-19T12:00:00Z"
        updatedAt        = "2026-04-19T12:00:00Z"
      }
      "listing-007" = {
        sellerId          = "vendor-pacific-catch"
        sellerName        = "Pacific Catch Seafood"
        species           = "Vermilion Rockfish"
        grade             = "B"
        title             = "Rockfish - Grade B"
        quantity          = 75
        unit              = "lbs"
        pricePerUnit      = 8.50
        freshnessDate     = "2026-04-19T10:00:00Z"
        expiresAt         = "2026-04-21T10:00:00Z"
        location = {
          address   = "123 Fisherman's Wharf, San Francisco, CA"
          latitude  = 37.8080
          longitude = -122.4177
        }
        deliveryAvailable = false
        photos = [
          "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"
        ]
        status           = "active"
        rating           = 4.2
        reviewCount      = 34
        createdAt        = "2026-04-19T12:00:00Z"
        updatedAt        = "2026-04-19T12:00:00Z"
      }
      "listing-008" = {
        sellerId          = "vendor-ocean-fresh"
        sellerName        = "Ocean Fresh Market"
        species           = "Red King Crab"
        grade             = "A"
        title             = "King Crab Legs - Cooked"
        quantity          = 40
        unit              = "lbs"
        pricePerUnit      = 52.00
        freshnessDate     = "2026-04-19T10:00:00Z"
        expiresAt         = "2026-05-03T10:00:00Z"
        location = {
          address   = "456 Pier 55, Seattle, WA"
          latitude  = 47.6046
          longitude = -122.3388
        }
        deliveryAvailable = true
        deliveryFee       = 15.00
        photos = [
          "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"
        ]
        status           = "active"
        rating           = 4.9
        reviewCount      = 278
        createdAt        = "2026-04-19T12:00:00Z"
        updatedAt        = "2026-04-19T12:00:00Z"
      }
    }
  })
}

# Resource to seed Firestore data using gcloud
resource "null_resource" "seed_data" {
  count = var.seed_production_data ? 1 : 0

  triggers = {
    seed_json = local.seed_data_json
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command = <<-EOT
      set -e
      echo "Seeding production Firestore data..."
      
      # Create seed data file
      cat > /tmp/seed_data.json << 'SEEDJSON'
      ${local.seed_data_json}
      SEEDJSON
      
      # Function to create/update Firestore document
      create_doc() {
        local collection=$1
        local doc_id=$2
        local data=$3
        
        echo "Creating $collection/$doc_id"
        
        # Use gcloud to create the document
        gcloud firestore documents patch "$collection/$doc_id" \
          --project="${var.project_id}" \
          --database="(default)" \
          --data="$data" \
          --update-mask="" \
          2>/dev/null || \
        gcloud firestore documents create "$collection/$doc_id" \
          --project="${var.project_id}" \
          --database="(default)" \
          --data="$data" \
          2>/dev/null || true
      }
      
      # Seed users
      echo "Seeding users..."
      create_doc "users" "vendor-pacific-catch" '{"fields": {"email": {"stringValue": "pacific@catch.com"}, "displayName": {"stringValue": "Pacific Catch Seafood"}, "photoURL": {"stringValue": "https://ui-avatars.com/api/?name=Pacific+Catch&background=0D8ABC&color=fff"}, "phoneNumber": {"stringValue": "+1-415-555-0100"}, "isVendor": {"booleanValue": true}, "businessName": {"stringValue": "Pacific Catch Seafood Co."}, "businessAddress": {"mapValue": {"fields": {"street": {"stringValue": "123 Fisherman'"'"'s Wharf"}, "city": {"stringValue": "San Francisco"}, "state": {"stringValue": "CA"}, "zip": {"stringValue": "94133"}, "lat": {"doubleValue": 37.808}, "lng": {"doubleValue": -122.4177}}}}, "rating": {"doubleValue": 4.8}, "totalSales": {"integerValue": "127"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      create_doc "users" "vendor-ocean-fresh" '{"fields": {"email": {"stringValue": "ocean@fresh.com"}, "displayName": {"stringValue": "Ocean Fresh Market"}, "photoURL": {"stringValue": "https://ui-avatars.com/api/?name=Ocean+Fresh&background=27AE60&color=fff"}, "phoneNumber": {"stringValue": "+1-206-555-0200"}, "isVendor": {"booleanValue": true}, "businessName": {"stringValue": "Ocean Fresh Market"}, "businessAddress": {"mapValue": {"fields": {"street": {"stringValue": "456 Pier 55"}, "city": {"stringValue": "Seattle"}, "state": {"stringValue": "WA"}, "zip": {"stringValue": "98101"}, "lat": {"doubleValue": 47.6046}, "lng": {"doubleValue": -122.3388}}}}, "rating": {"doubleValue": 4.6}, "totalSales": {"integerValue": "89"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      create_doc "users" "buyer-sushi-master" '{"fields": {"email": {"stringValue": "sushi@master.com"}, "displayName": {"stringValue": "Sushi Master Restaurant"}, "photoURL": {"stringValue": "https://ui-avatars.com/api/?name=Sushi+Master&background=E74C3C&color=fff"}, "phoneNumber": {"stringValue": "+1-415-555-0300"}, "isVendor": {"booleanValue": false}, "isBuyer": {"booleanValue": true}, "businessName": {"stringValue": "Sushi Master Restaurant"}, "businessAddress": {"mapValue": {"fields": {"street": {"stringValue": "789 Mission St"}, "city": {"stringValue": "San Francisco"}, "state": {"stringValue": "CA"}, "zip": {"stringValue": "94103"}, "lat": {"doubleValue": 37.7858}, "lng": {"doubleValue": -122.4064}}}}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      create_doc "users" "buyer-fish-co" '{"fields": {"email": {"stringValue": "fish@co.com"}, "displayName": {"stringValue": "City Fish Company"}, "photoURL": {"stringValue": "https://ui-avatars.com/api/?name=City+Fish&background=F39C12&color=fff"}, "phoneNumber": {"stringValue": "+1-503-555-0400"}, "isVendor": {"booleanValue": false}, "isBuyer": {"booleanValue": true}, "businessName": {"stringValue": "City Fish Company"}, "businessAddress": {"mapValue": {"fields": {"street": {"stringValue": "321 Waterfront Ave"}, "city": {"stringValue": "Portland"}, "state": {"stringValue": "OR"}, "zip": {"stringValue": "97201"}, "lat": {"doubleValue": 45.5152}, "lng": {"doubleValue": -122.6784}}}}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      echo "Seeding listings..."
      
      # Listing 001 - Salmon
      create_doc "listings" "listing-001" '{"fields": {"sellerId": {"stringValue": "vendor-pacific-catch"}, "sellerName": {"stringValue": "Pacific Catch Seafood"}, "species": {"stringValue": "Chinook Salmon"}, "grade": {"stringValue": "A"}, "title": {"stringValue": "Wild Alaskan Salmon - Sushi Grade"}, "quantity": {"integerValue": "50"}, "unit": {"stringValue": "lbs"}, "pricePerUnit": {"doubleValue": 28.50}, "freshnessDate": {"timestampValue": "2026-04-19T10:00:00Z"}, "expiresAt": {"timestampValue": "2026-04-22T10:00:00Z"}, "location": {"mapValue": {"fields": {"address": {"stringValue": "123 Fisherman'"'"'s Wharf, San Francisco, CA"}, "latitude": {"doubleValue": 37.808}, "longitude": {"doubleValue": -122.4177}}}}, "deliveryAvailable": {"booleanValue": true}, "deliveryFee": {"doubleValue": 5.00}, "photos": {"arrayValue": {"values": [{"stringValue": "https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=800"}, {"stringValue": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"}]}}, "status": {"stringValue": "active"}, "sushiCertNumber": {"stringValue": "SUSHI-001"}, "sushiCertExpiry": {"timestampValue": "2026-07-19T10:00:00Z"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      # Listing 002 - Crab
      create_doc "listings" "listing-002" '{"fields": {"sellerId": {"stringValue": "vendor-pacific-catch"}, "sellerName": {"stringValue": "Pacific Catch Seafood"}, "species": {"stringValue": "Dungeness Crab"}, "grade": {"stringValue": "A"}, "title": {"stringValue": "Dungeness Crab - Live"}, "quantity": {"integerValue": "25"}, "unit": {"stringValue": "crabs"}, "pricePerUnit": {"doubleValue": 18.00}, "freshnessDate": {"timestampValue": "2026-04-19T10:00:00Z"}, "expiresAt": {"timestampValue": "2026-04-22T10:00:00Z"}, "location": {"mapValue": {"fields": {"address": {"stringValue": "123 Fisherman'"'"'s Wharf, San Francisco, CA"}, "latitude": {"doubleValue": 37.808}, "longitude": {"doubleValue": -122.4177}}}}, "deliveryAvailable": {"booleanValue": false}, "photos": {"arrayValue": {"values": [{"stringValue": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"}]}}, "status": {"stringValue": "active"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      # Listing 003 - Halibut
      create_doc "listings" "listing-003" '{"fields": {"sellerId": {"stringValue": "vendor-ocean-fresh"}, "sellerName": {"stringValue": "Ocean Fresh Market"}, "species": {"stringValue": "Pacific Halibut"}, "grade": {"stringValue": "A"}, "title": {"stringValue": "Pacific Halibut Fillets"}, "quantity": {"integerValue": "30"}, "unit": {"stringValue": "lbs"}, "pricePerUnit": {"doubleValue": 32.00}, "freshnessDate": {"timestampValue": "2026-04-19T10:00:00Z"}, "expiresAt": {"timestampValue": "2026-04-23T10:00:00Z"}, "location": {"mapValue": {"fields": {"address": {"stringValue": "456 Pier 55, Seattle, WA"}, "latitude": {"doubleValue": 47.6046}, "longitude": {"doubleValue": -122.3388}}}}, "deliveryAvailable": {"booleanValue": true}, "deliveryFee": {"doubleValue": 8.00}, "photos": {"arrayValue": {"values": [{"stringValue": "https://images.unsplash.com/photo-1615141982880-1313d06a0b17?w=800"}, {"stringValue": "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800"}]}}, "status": {"stringValue": "active"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      # Listing 004 - Tuna
      create_doc "listings" "listing-004" '{"fields": {"sellerId": {"stringValue": "vendor-ocean-fresh"}, "sellerName": {"stringValue": "Ocean Fresh Market"}, "species": {"stringValue": "Yellowfin Tuna"}, "grade": {"stringValue": "A"}, "title": {"stringValue": "Ahi Tuna - Sushi Grade"}, "quantity": {"integerValue": "40"}, "unit": {"stringValue": "lbs"}, "pricePerUnit": {"doubleValue": 45.00}, "freshnessDate": {"timestampValue": "2026-04-19T10:00:00Z"}, "expiresAt": {"timestampValue": "2026-04-20T10:00:00Z"}, "location": {"mapValue": {"fields": {"address": {"stringValue": "456 Pier 55, Seattle, WA"}, "latitude": {"doubleValue": 47.6046}, "longitude": {"doubleValue": -122.3388}}}}, "deliveryAvailable": {"booleanValue": true}, "deliveryFee": {"doubleValue": 10.00}, "photos": {"arrayValue": {"values": [{"stringValue": "https://images.unsplash.com/photo-1579631542720-3f8b28c51db6?w=800"}, {"stringValue": "https://images.unsplash.com/photo-1559563362-c667ba5f5480?w=800"}]}}, "status": {"stringValue": "active"}, "sushiCertNumber": {"stringValue": "SUSHI-002"}, "sushiCertExpiry": {"timestampValue": "2026-06-19T10:00:00Z"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      # Listing 005 - Oysters
      create_doc "listings" "listing-005" '{"fields": {"sellerId": {"stringValue": "vendor-pacific-catch"}, "sellerName": {"stringValue": "Pacific Catch Seafood"}, "species": {"stringValue": "Kumamoto Oyster"}, "grade": {"stringValue": "A"}, "title": {"stringValue": "Oysters - Kumamoto"}, "quantity": {"integerValue": "200"}, "unit": {"stringValue": "each"}, "pricePerUnit": {"doubleValue": 2.50}, "freshnessDate": {"timestampValue": "2026-04-19T10:00:00Z"}, "expiresAt": {"timestampValue": "2026-04-26T10:00:00Z"}, "location": {"mapValue": {"fields": {"address": {"stringValue": "123 Fisherman'"'"'s Wharf, San Francisco, CA"}, "latitude": {"doubleValue": 37.808}, "longitude": {"doubleValue": -122.4177}}}}, "deliveryAvailable": {"booleanValue": true}, "deliveryFee": {"doubleValue": 3.00}, "photos": {"arrayValue": {"values": [{"stringValue": "https://images.unsplash.com/photo-1559305289-4c31700ba9cb?w=800"}]}}, "status": {"stringValue": "active"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      # Listing 006 - Spot Prawns
      create_doc "listings" "listing-006" '{"fields": {"sellerId": {"stringValue": "vendor-ocean-fresh"}, "sellerName": {"stringValue": "Ocean Fresh Market"}, "species": {"stringValue": "Spot Prawn"}, "grade": {"stringValue": "A"}, "title": {"stringValue": "Spot Prawns - Fresh"}, "quantity": {"integerValue": "15"}, "unit": {"stringValue": "lbs"}, "pricePerUnit": {"doubleValue": 38.00}, "freshnessDate": {"timestampValue": "2026-04-19T10:00:00Z"}, "expiresAt": {"timestampValue": "2026-04-20T10:00:00Z"}, "location": {"mapValue": {"fields": {"address": {"stringValue": "456 Pier 55, Seattle, WA"}, "latitude": {"doubleValue": 47.6046}, "longitude": {"doubleValue": -122.3388}}}}, "deliveryAvailable": {"booleanValue": false}, "photos": {"arrayValue": {"values": [{"stringValue": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"}]}}, "status": {"stringValue": "active"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      # Listing 007 - Rockfish
      create_doc "listings" "listing-007" '{"fields": {"sellerId": {"stringValue": "vendor-pacific-catch"}, "sellerName": {"stringValue": "Pacific Catch Seafood"}, "species": {"stringValue": "Vermilion Rockfish"}, "grade": {"stringValue": "B"}, "title": {"stringValue": "Rockfish - Grade B"}, "quantity": {"integerValue": "75"}, "unit": {"stringValue": "lbs"}, "pricePerUnit": {"doubleValue": 8.50}, "freshnessDate": {"timestampValue": "2026-04-19T10:00:00Z"}, "expiresAt": {"timestampValue": "2026-04-21T10:00:00Z"}, "location": {"mapValue": {"fields": {"address": {"stringValue": "123 Fisherman'"'"'s Wharf, San Francisco, CA"}, "latitude": {"doubleValue": 37.808}, "longitude": {"doubleValue": -122.4177}}}}, "deliveryAvailable": {"booleanValue": false}, "photos": {"arrayValue": {"values": [{"stringValue": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"}]}}, "status": {"stringValue": "active"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      # Listing 008 - King Crab
      create_doc "listings" "listing-008" '{"fields": {"sellerId": {"stringValue": "vendor-ocean-fresh"}, "sellerName": {"stringValue": "Ocean Fresh Market"}, "species": {"stringValue": "Red King Crab"}, "grade": {"stringValue": "A"}, "title": {"stringValue": "King Crab Legs - Cooked"}, "quantity": {"integerValue": "40"}, "unit": {"stringValue": "lbs"}, "pricePerUnit": {"doubleValue": 52.00}, "freshnessDate": {"timestampValue": "2026-04-19T10:00:00Z"}, "expiresAt": {"timestampValue": "2026-05-03T10:00:00Z"}, "location": {"mapValue": {"fields": {"address": {"stringValue": "456 Pier 55, Seattle, WA"}, "latitude": {"doubleValue": 47.6046}, "longitude": {"doubleValue": -122.3388}}}}, "deliveryAvailable": {"booleanValue": true}, "deliveryFee": {"doubleValue": 15.00}, "photos": {"arrayValue": {"values": [{"stringValue": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800"}]}}, "status": {"stringValue": "active"}, "createdAt": {"timestampValue": "2026-04-19T12:00:00Z"}, "updatedAt": {"timestampValue": "2026-04-19T12:00:00Z"}}}'
      
      echo "✅ Seed data created successfully!"
      rm -f /tmp/seed_data.json
    EOT
  }

  depends_on = [
    google_firestore_database.main,
    google_firestore_index.listings_active_expiry,
    google_firebaserules_release.firestore
  ]
}
