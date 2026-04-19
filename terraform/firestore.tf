# Firestore Database
resource "google_firestore_database" "main" {
  name                        = "(default)"
  location_id                 = "nam5" # US multi-region
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED" # Fixed: was ENABLED, which is deprecated

  deletion_policy = "ABANDON"

  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"

  depends_on = [
    google_project_service.firestore
  ]
}

# Firestore Security Rules
resource "google_firebaserules_ruleset" "firestore" {
  project = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../firestore.rules")
    }
  }

  depends_on = [
    google_firestore_database.main
  ]
}

resource "google_firebaserules_release" "firestore" {
  name       = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
  project    = var.project_id
}

# Firestore Indexes - Listings by seller
resource "google_firestore_index" "listings_by_seller" {
  database    = "(default)"
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

  depends_on = [
    google_firestore_database.main
  ]
}

# Firestore Indexes - Active listings with expiry
resource "google_firestore_index" "listings_active_expiry" {
  database    = "(default)"
  collection  = "listings"
  query_scope = "COLLECTION"

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  fields {
    field_path = "expiresAt"
    order      = "ASCENDING"
  }

  depends_on = [
    google_firestore_database.main
  ]
}

# Firestore Indexes - Orders by buyer
resource "google_firestore_index" "orders_by_buyer" {
  database    = "(default)"
  collection  = "orders"
  query_scope = "COLLECTION"

  fields {
    field_path = "buyerId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  depends_on = [
    google_firestore_database.main
  ]
}

# Firestore Indexes - Orders by seller
resource "google_firestore_index" "orders_by_seller" {
  database    = "(default)"
  collection  = "orders"
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

  depends_on = [
    google_firestore_database.main
  ]
}

# Firestore Indexes - Standing orders by buyer
resource "google_firestore_index" "standing_orders_by_buyer" {
  database    = "(default)"
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

  depends_on = [
    google_firestore_database.main
  ]
}
