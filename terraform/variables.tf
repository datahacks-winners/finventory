variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "firestore_location" {
  description = "Firestore database location"
  type        = string
  default     = "us-central1"
}

variable "domain_name" {
  description = "Custom domain for Cloud Run service"
  type        = string
}

variable "google_oauth_client_id" {
  description = "Google OAuth client ID"
  type        = string
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "apple_sign_in_client_id" {
  description = "Apple Sign In client ID"
  type        = string
  sensitive   = true
}

variable "apple_sign_in_client_secret" {
  description = "Apple Sign In client secret"
  type        = string
  sensitive   = true
}

variable "fcm_server_key" {
  description = "FCM server key (legacy, for migration)"
  type        = string
  sensitive   = true
}

variable "org_id" {
  description = "GCP organization ID"
  type        = string
}

variable "billing_account" {
  description = "GCP billing account ID"
  type        = string
}

variable "seed_production_data" {
  description = "Whether to seed production database with sample data"
  type        = bool
  default     = false
}
