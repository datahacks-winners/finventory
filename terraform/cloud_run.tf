# Cloud Run Service and Load Balancer
# RESTful API for mobile app with HTTPS load balancer and SSL certificate

# Cloud Run service
resource "google_cloud_run_v2_service" "mobile_api" {
  name     = "mobile-api"
  location = var.region
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    containers {
      image = "gcr.io/${var.project_id}/mobile-api:latest"

      # Environment variables
      env {
        name  = "FIRESTORE_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "PUBSUB_TOPIC_INVENTORY"
        value = google_pubsub_topic.inventory_updates.name
      }

      env {
        name  = "STORAGE_BUCKET_PHOTOS"
        value = google_storage_bucket.listing_photos.name
      }

      # Resource limits
      resources {
        cpu_idle          = true
        startup_cpu_boost = true
        limits = {
          cpu    = "2"
          memory = "2048Mi"
        }
      }

      # Health checks
      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 30
        period_seconds        = 10
        failure_threshold     = 3
        http_get {
          path = "/health"
        }
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
      }
    }

    # Service account
    service_account = google_service_account.cloud_run_invoker.email
  }

  # Traffic configuration
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run,
    google_storage_bucket.listing_photos,
    google_pubsub_topic.inventory_updates
  ]
}

# Domain mapping for Cloud Run service
resource "google_cloud_run_domain_mapping" "main" {
  location = var.region
  name     = var.domain_name
  project  = var.project_id

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.mobile_api.name
  }

  depends_on = [
    google_cloud_run_v2_service.mobile_api
  ]
}

# Managed SSL certificate
resource "google_compute_managed_ssl_certificate" "main" {
  name = "${var.project_id}-ssl-cert"

  managed {
    domains = [var.domain_name]
  }
}

# Global health check for load balancer
resource "google_compute_health_check" "cloud_run" {
  name = "${var.project_id}-cloud-run-health-check"

  http_health_check {
    port         = 443
    request_path = "/health"
  }

  check_interval_sec  = 30
  timeout_sec         = 10
  healthy_threshold   = 2
  unhealthy_threshold = 3
}

# Backend service for Cloud Run
resource "google_compute_backend_service" "cloud_run" {
  name        = "${var.project_id}-cloud-run-backend"
  project     = var.project_id
  port_name   = "https"
  protocol    = "HTTPS"
  timeout_sec = 300

  health_checks = [google_compute_health_check.cloud_run.id]

  backend {
    group = google_compute_region_network_endpoint_group.cloud_run.id
  }

  depends_on = [
    google_project_service.compute
  ]
}

# Network endpoint group for Cloud Run
resource "google_compute_region_network_endpoint_group" "cloud_run" {
  name                  = "${var.project_id}-cloud-run-neg"
  project               = var.project_id
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.mobile_api.name
  }

  depends_on = [
    google_cloud_run_v2_service.mobile_api
  ]
}

# URL map for load balancer
resource "google_compute_url_map" "main" {
  name    = "${var.project_id}-url-map"
  project = var.project_id

  default_service = google_compute_backend_service.cloud_run.id
}

# Target HTTPS proxy
resource "google_compute_target_https_proxy" "main" {
  name             = "${var.project_id}-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
}

# Global forwarding rule (HTTPS)
resource "google_compute_global_forwarding_rule" "https" {
  name        = "${var.project_id}-https-forwarding-rule"
  project     = var.project_id
  target      = google_compute_target_https_proxy.main.id
  port_range  = "443"
  ip_protocol = "TCP"

  load_balancing_scheme = "EXTERNAL"
}

# Reserve static IP address
resource "google_compute_global_address" "main" {
  name       = "${var.project_id}-global-ip"
  project    = var.project_id
  ip_version = "IPV4"
}

# DNS record (requires Cloud DNS, manual setup for now)
# This is a placeholder - actual DNS setup depends on DNS provider
output "dns_a_record_config" {
  description = "DNS A record configuration"
  value = {
    type  = "A"
    name  = var.domain_name
    value = google_compute_global_address.main.address
    ttl   = 300
  }
}
