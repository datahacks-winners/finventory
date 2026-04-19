# Storage bucket for function source code
resource "google_storage_bucket" "function_sources" {
  name                        = "${var.project_id}-function-sources"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

# Create Listing function
module "create_listing_function" {
  source = "./modules/cloud_function"

  providers = {
    google = google
  }

  name          = "create-listing"
  location      = var.region
  description   = "Validate and create a new listing"
  runtime       = "nodejs20"
  entry_point   = "createListing"
  memory        = "512M"
  timeout       = 60
  max_instances = 100
  min_instances = 0
  source_bucket = google_storage_bucket.function_sources.name

  environment_variables = {
    FIRESTORE_DB = google_firestore_database.main.name
    PROJECT_ID   = var.project_id
    PUBSUB_TOPIC = google_pubsub_topic.inventory_updates.id
  }

  event_triggers = [{
    trigger    = "google.cloud.firestore.v1.Firestore"
    event_type = "google.cloud.firestore.document.v1.created"
    resource   = "${google_firestore_database.main.name}/documents/listings/{documentId}"
  }]
}

# Match Standing Orders function (scheduled)
module "match_standing_orders_function" {
  source = "./modules/cloud_function"

  providers = {
    google = google
  }

  name          = "match-standing-orders"
  location      = var.region
  description   = "Match new listings against standing order criteria"
  runtime       = "nodejs20"
  entry_point   = "matchStandingOrders"
  memory        = "512M"
  timeout       = 300
  max_instances = 10
  min_instances = 0
  source_bucket = google_storage_bucket.function_sources.name

  environment_variables = {
    FIRESTORE_DB = google_firestore_database.main.name
    PROJECT_ID   = var.project_id
    PUBSUB_TOPIC = google_pubsub_topic.inventory_updates.id
  }

  event_triggers = [{
    trigger    = "google.cloud.scheduler.v1.Job"
    event_type = "google.cloud.scheduler.v1.Job"
    resource   = "projects/${var.project_id}/locations/${var.region}/jobs/match-standing-orders"
  }]
}
