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

# IAM: Cloud Functions access to secrets
resource "google_secret_manager_secret_iam_member" "stripe_api_key_cf" {
  secret_id = google_secret_manager_secret.stripe_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_secret_manager_secret_iam_member" "apple_secrets_cf" {
  for_each = toset([
    google_secret_manager_secret.apple_key_id.id,
    google_secret_manager_secret.apple_private_key.id,
    google_secret_manager_secret.apple_team_id.id
  ])

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

resource "google_secret_manager_secret_iam_member" "apple_secrets_cr" {
  for_each = {
    apple_key_id       = google_secret_manager_secret.apple_key_id.id
    apple_private_key  = google_secret_manager_secret.apple_private_key.id
    apple_team_id      = google_secret_manager_secret.apple_team_id.id
  }

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_invoker.email}"
}
