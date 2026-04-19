# IAM and Service Accounts
# Service accounts and IAM bindings for Cloud Functions, Cloud Run, and Pub/Sub

# Service Account: Cloud Functions
resource "google_service_account" "cloud_functions" {
  account_id   = "cloud-functions-sa"
  display_name = "Cloud Functions Service Account"
  description  = "Service account for Cloud Functions to access GCP resources"
}

# Service Account: Cloud Run
resource "google_service_account" "cloud_run_invoker" {
  account_id   = "cloud-run-invoker-sa"
  display_name = "Cloud Run Invoker Service Account"
  description  = "Service account for Cloud Run service to access GCP resources"
}

# Service Account: Pub/Sub Invoker
resource "google_service_account" "pubsub_invoker" {
  account_id   = "pubsub-invoker-sa"
  display_name = "Pub/Sub Invoker Service Account"
  description  = "Service account for Pub/Sub push subscriptions to invoke Cloud Functions"
}

# Service Account: Cloud Scheduler (for scheduled jobs)
resource "google_service_account" "scheduler" {
  account_id   = "scheduler-sa"
  display_name = "Cloud Scheduler Service Account"
  description  = "Service account for Cloud Scheduler to invoke Cloud Functions"
}

# IAM: Cloud Functions roles
resource "google_project_iam_member" "cloud_functions_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_project_iam_member" "cloud_functions_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.editor"
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_project_iam_member" "cloud_functions_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_project_iam_member" "cloud_functions_fcm" {
  project = var.project_id
  role    = "roles/firebase.cloudmessaging.admin"
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

# IAM: Cloud Run roles
resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_invoker.email}"
}

resource "google_project_iam_member" "cloud_run_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.cloud_run_invoker.email}"
}

resource "google_project_iam_member" "cloud_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.cloud_run_invoker.email}"
}

# IAM: Pub/Sub Invoker roles
# Note: Functions are created via modules, using their output URIs
# IAM bindings for functions are configured in the modules themselves

# IAM: Storage bucket access for service accounts
resource "google_storage_bucket_iam_member" "cloud_functions_listing_photos" {
  bucket = google_storage_bucket.listing_photos.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_storage_bucket_iam_member" "cloud_functions_certificates" {
  bucket = google_storage_bucket.certificates.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_functions.email}"
}

# IAM: Firestore access
resource "google_firestore_index" "users_buyer_id" {
  project     = var.project_id
  collection  = "users"
  query_scope = "COLLECTION"

  fields {
    field_path = "buyerId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "ASCENDING"
  }
}

# IAM: Pub/Sub subscription access
resource "google_pubsub_subscription_iam_member" "pubsub_invoker_subscription" {
  subscription = google_pubsub_subscription.mobile_push.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

resource "google_pubsub_subscription_iam_member" "pubsub_invoker_standing" {
  subscription = google_pubsub_subscription.standing_order_matcher.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

# IAM: Enable service account token creation
resource "google_service_account_iam_member" "cloud_functions_token_creator" {
  service_account_id = google_service_account.cloud_functions.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

resource "google_service_account_iam_member" "cloud_run_token_creator" {
  service_account_id = google_service_account.cloud_run_invoker.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}
