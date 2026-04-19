# Secret Manager Resources
# Securely store sensitive configuration values

# Enable Secret Manager API
resource "google_project_service" "secret_manager" {
  project = var.project_id
  service = "secretmanager.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

# Secret: Stripe API key
resource "google_secret_manager_secret" "stripe_api_key" {
  secret_id = "stripe-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "payments"
  }
}

# Secret version: Stripe API key (actual value set manually)
resource "google_secret_manager_secret_version" "stripe_api_key" {
  secret      = google_secret_manager_secret.stripe_api_key.id
  secret_data = "placeholder-update-with-actual-key"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Secret: Apple Sign In key ID
resource "google_secret_manager_secret" "apple_key_id" {
  secret_id = "apple-key-id"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "authentication"
  }
}

resource "google_secret_manager_secret_version" "apple_key_id" {
  secret      = google_secret_manager_secret.apple_key_id.id
  secret_data = "placeholder-update-with-actual-key-id"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Secret: Apple Sign In private key
resource "google_secret_manager_secret" "apple_private_key" {
  secret_id = "apple-private-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "authentication"
  }
}

resource "google_secret_manager_secret_version" "apple_private_key" {
  secret      = google_secret_manager_secret.apple_private_key.id
  secret_data = "placeholder-update-with-actual-private-key"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Secret: Apple Sign In team ID
resource "google_secret_manager_secret" "apple_team_id" {
  secret_id = "apple-team-id"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "authentication"
  }
}

resource "google_secret_manager_secret_version" "apple_team_id" {
  secret      = google_secret_manager_secret.apple_team_id.id
  secret_data = "placeholder-update-with-actual-team-id"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Secret: Gemini AI Studio API key
resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "ai"
  }
}

resource "google_secret_manager_secret_version" "gemini_api_key" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = "AIzaSyCSUazUCkFmRyqZTPdVGDBTX0T8__DkC4s"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# IAM: Cloud Functions access to secrets
resource "google_secret_manager_secret_iam_member" "stripe_api_key_cf" {
  secret_id = google_secret_manager_secret.stripe_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_secret_manager_secret_iam_member" "apple_secrets_cf" {
  for_each = {
    apple_key_id      = google_secret_manager_secret.apple_key_id.id
    apple_private_key = google_secret_manager_secret.apple_private_key.id
    apple_team_id     = google_secret_manager_secret.apple_team_id.id
  }

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_functions.email}"
}

# IAM: Cloud Run access to secrets
resource "google_secret_manager_secret_iam_member" "stripe_api_key_cr" {
  secret_id = google_secret_manager_secret.stripe_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_invoker.email}"
}

resource "google_secret_manager_secret_iam_member" "gemini_api_key_cr" {
  secret_id = google_secret_manager_secret.gemini_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_invoker.email}"
}

resource "google_secret_manager_secret_iam_member" "apple_secrets_cr" {
  for_each = {
    apple_key_id      = google_secret_manager_secret.apple_key_id.id
    apple_private_key = google_secret_manager_secret.apple_private_key.id
    apple_team_id     = google_secret_manager_secret.apple_team_id.id
  }

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_invoker.email}"
}

# Firebase Web Config Secrets (for Cloud Build)
resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "firebase-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "firebase"
    type        = "web-config"
  }
}

resource "google_secret_manager_secret_version" "firebase_api_key" {
  secret      = google_secret_manager_secret.firebase_api_key.id
  secret_data = "placeholder-update-with-actual-firebase-api-key"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "firebase_auth_domain" {
  secret_id = "firebase-auth-domain"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "firebase"
    type        = "web-config"
  }
}

resource "google_secret_manager_secret_version" "firebase_auth_domain" {
  secret      = google_secret_manager_secret.firebase_auth_domain.id
  secret_data = "${var.project_id}.firebaseapp.com"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "firebase_project_id" {
  secret_id = "firebase-project-id"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "firebase"
    type        = "web-config"
  }
}

resource "google_secret_manager_secret_version" "firebase_project_id" {
  secret      = google_secret_manager_secret.firebase_project_id.id
  secret_data = var.project_id

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "firebase_storage_bucket" {
  secret_id = "firebase-storage-bucket"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "firebase"
    type        = "web-config"
  }
}

resource "google_secret_manager_secret_version" "firebase_storage_bucket" {
  secret      = google_secret_manager_secret.firebase_storage_bucket.id
  secret_data = "${var.project_id}.appspot.com"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "firebase_messaging_sender_id" {
  secret_id = "firebase-messaging-sender-id"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "firebase"
    type        = "web-config"
  }
}

resource "google_secret_manager_secret_version" "firebase_messaging_sender_id" {
  secret      = google_secret_manager_secret.firebase_messaging_sender_id.id
  secret_data = "593576627371"  # Project number

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "firebase_app_id" {
  secret_id = "firebase-app-id"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "firebase"
    type        = "web-config"
  }
}

resource "google_secret_manager_secret_version" "firebase_app_id" {
  secret      = google_secret_manager_secret.firebase_app_id.id
  secret_data = "placeholder-update-with-actual-app-id"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "pexels_api_key" {
  secret_id = "pexels-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "images"
  }
}

resource "google_secret_manager_secret_version" "pexels_api_key" {
  secret      = google_secret_manager_secret.pexels_api_key.id
  secret_data = "placeholder-update-with-actual-pexels-key"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# IAM: Cloud Build access to Firebase web config secrets
data "google_project" "project" {
  project_id = var.project_id
}

resource "google_secret_manager_secret_iam_member" "firebase_config_cloudbuild" {
  for_each = {
    api_key               = google_secret_manager_secret.firebase_api_key.id
    auth_domain           = google_secret_manager_secret.firebase_auth_domain.id
    project_id            = google_secret_manager_secret.firebase_project_id.id
    storage_bucket        = google_secret_manager_secret.firebase_storage_bucket.id
    messaging_sender_id   = google_secret_manager_secret.firebase_messaging_sender_id.id
    app_id                = google_secret_manager_secret.firebase_app_id.id
    pexels_key            = google_secret_manager_secret.pexels_api_key.id
  }

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}
