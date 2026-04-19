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
      enabled = true
      password_required = true
    }
  }

  # Authorization configuration
  authorization {
    allow_only_verified_emails = true
  }

  # Monitoring configuration
  monitoring {
    request_logging {
      enabled = true
    }
  }

  # Multi-tenant configuration (single tenant for now)
  multi_tenant {
    allow_tenants_creation = false
  }
}

# Default tenant config
resource "google_identity_platform_default_supported_idp_config" "google" {
  project   = var.project_id
  idp_id    = "google.com"
  client_id = var.google_oauth_client_id
  enabled   = true
}

# Apple Sign In provider
resource "google_identity_platform_default_supported_idp_config" "apple" {
  project   = var.project_id
  idp_id    = "apple.com"
  client_id = var.apple_sign_in_client_id
  enabled   = true
}

# OAuth IDP config for additional providers (future-proofing)
resource "google_identity_platform_default_idp_config" "oauth" {
  project     = var.project_id
  idp_id      = "oidc"
  name        = "OIDC"
  enabled     = false # Disabled by default
  client_id   = ""
  issuer      = ""

  lifecycle {
    ignore_changes = [
      client_id,
      issuer,
      enabled
    ]
  }
}

# Email/password authentication
resource "google_identity_project_default_config" "default" {
  project = var.project_id

  sign_in {
    allow_duplicate_emails = false
    email {
      enabled = true
    }
  }
}

# SMS authentication (optional, for phone verification)
# Disabled by default, can be enabled later
resource "google_identity_platform_sms_region_config" "sms" {
  project  = var.project_id
  region   = "us-central1"
  enabled  = false # Enable later if needed

  lifecycle {
    ignore_changes = [enabled]
  }
}
