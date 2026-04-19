# Cloud Identity Platform (Firebase Auth)
# User authentication with Google OAuth and Apple Sign In

# Enable Identity Platform API
resource "google_project_service" "identity_platform" {
  project = var.project_id
  service = "identitytoolkit.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

# Identity Platform config
resource "google_identity_platform_config" "main" {
  project = var.project_id

  # Sign-in methods
  sign_in {
    allow_duplicate_emails = false
    anonymous {
      enabled = false
    }
    email {
      enabled           = true
      password_required = true
    }
  }

  # Monitoring configuration
  monitoring {
    request_logging {
      enabled = true
    }
  }
}

# Default tenant config - Google OAuth
resource "google_identity_platform_default_supported_idp_config" "google" {
  project      = var.project_id
  idp_id       = "google.com"
  client_id    = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret
  enabled      = true
}

# Apple Sign In provider
resource "google_identity_platform_default_supported_idp_config" "apple" {
  project      = var.project_id
  idp_id       = "apple.com"
  client_id    = var.apple_sign_in_client_id
  client_secret = var.apple_sign_in_client_secret
  enabled      = true
}
