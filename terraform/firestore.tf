resource "google_firestore_database" "main" {
  name                        = "finventory-main"
  location_id                 = var.firestore_location
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "ENABLED"

  deletion_policy = "ABANDON"

  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"
}

# Listings collection index
resource "google_firestore_index" "listings_by_seller" {
  database    = google_firestore_database.main.name
  collection  = "listings"
  query_scope = "COLLECTION"

  fields {
    field_path = "sellerId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# Geospatial index for location-based queries
resource "google_firestore_index" "listings_geo" {
  database    = google_firestore_database.main.name
  collection  = "listings"
  query_scope = "COLLECTION"

  fields {
    field_path = "location.geohash"
    order      = "ASCENDING"
  }

  fields {
    field_path = "expiresAt"
    order      = "ASCENDING"
  }
}

# Orders index
resource "google_firestore_index" "orders_by_buyer" {
  database    = google_firestore_database.main.name
  collection  = "orders"
  query_scope = "COLLECTION"

  fields {
    field_path = "buyerId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
}

# Standing orders index
resource "google_firestore_index" "standing_orders_active" {
  database    = google_firestore_database.main.name
  collection  = "standingOrders"
  query_scope = "COLLECTION"

  fields {
    field_path = "buyerId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "isActive"
    order      = "ASCENDING"
  }
}
