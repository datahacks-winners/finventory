# Cloud Run API Service (replaces Cloud Functions)
# Provides REST API for mobile app and web frontend

resource "google_cloud_run_v2_service" "api" {
  name     = "api"
  location = var.region
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/api-images/api:latest"

      ports {
        container_port = 8080
      }

      env {
        name  = "FIRESTORE_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "PUBSUB_TOPIC_INVENTORY"
        value = google_pubsub_topic.inventory_updates.id
      }

      env {
        name  = "STORAGE_BUCKET_PHOTOS"
        value = google_storage_bucket.listing_photos.name
      }

      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }

      resources {
        cpu_idle = true
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }

      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 10
        period_seconds        = 5
        failure_threshold     = 3
        http_get {
          path = "/health"
          port = 8080
        }
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
      }
    }

    service_account = google_service_account.cloud_run_invoker.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run,
    google_secret_manager_secret.gemini_api_key
  ]
}

# IAM: Allow public access to API
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# API URL output
output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

# Cloud Scheduler - Auto-downgrade sushi grade listings
resource "google_cloud_scheduler_job" "auto_downgrade_sushi" {
  name             = "auto-downgrade-sushi"
  description      = "Downgrade sushi-grade listings after 48 hours"
  schedule         = "0 * * * *" # Every hour
  time_zone        = "America/Los_Angeles"
  project          = var.project_id
  region           = var.region
  attempt_deadline = "60s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.api.uri}/jobs/downgrade-sushi"

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.cloud_run_invoker.email
    }
  }

  depends_on = [
    google_cloud_run_v2_service.api
  ]
}

# Cloud Scheduler - Match standing orders
resource "google_cloud_scheduler_job" "match_standing_orders" {
  name             = "match-standing-orders"
  description      = "Match new listings against standing order criteria"
  schedule         = "*/5 * * * *" # Every 5 minutes
  time_zone        = "America/Los_Angeles"
  project          = var.project_id
  region           = var.region
  attempt_deadline = "300s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.api.uri}/jobs/match-standing-orders"

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.cloud_run_invoker.email
    }
  }

  depends_on = [
    google_cloud_run_v2_service.api
  ]
}

# Firestore triggers via Eventarc - Listing Created
resource "google_eventarc_trigger" "listing_created" {
  name     = "listing-created"
  location = var.region

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.firestore.document.v1.created"
  }

  matching_criteria {
    attribute = "database"
    value     = "(default)"
  }

  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.api.name
      region  = var.region
      path    = "/triggers/listing-created"
    }
  }

  service_account = google_service_account.cloud_run_invoker.email

  depends_on = [
    google_cloud_run_v2_service.api,
    google_project_service.eventarc
  ]
}

# Firestore triggers via Eventarc - Order Created
resource "google_eventarc_trigger" "order_created" {
  name     = "order-created"
  location = var.region

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.firestore.document.v1.created"
  }

  matching_criteria {
    attribute = "database"
    value     = "(default)"
  }

  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.api.name
      region  = var.region
      path    = "/triggers/order-created"
    }
  }

  service_account = google_service_account.cloud_run_invoker.email

  depends_on = [
    google_cloud_run_v2_service.api,
    google_project_service.eventarc
  ]
}

# Enable Eventarc API
resource "google_project_service" "eventarc" {
  project = var.project_id
  service = "eventarc.googleapis.com"
}
