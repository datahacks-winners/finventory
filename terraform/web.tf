# Cloud Run Service for Web App
# Serves static files from container (nginx or dist served directly)

variable "web_image_tag" {
  description = "Web app container image tag"
  type        = string
  default     = "latest"
}

resource "google_cloud_run_v2_service" "web" {
  name     = "web"
  location = var.region
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    containers {
      image = "gcr.io/${var.project_id}/web:${var.web_image_tag}"

      resources {
        cpu_idle = true
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 10
        period_seconds        = 5
        failure_threshold     = 3
        http_get {
          path = "/"
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run
  ]
}

# IAM: Allow public access to web service
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Run domain mapping for web
resource "google_cloud_run_domain_mapping" "web" {
  location = var.region
  name     = "${var.project_id}-web"
  project  = var.project_id

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.web.name
  }

  depends_on = [
    google_cloud_run_v2_service.web
  ]
}
