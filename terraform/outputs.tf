output "project_id" {
  value = var.project_id
}

output "firestore_database_id" {
  value = google_firestore_database.main.name
}

output "web_url" {
  description = "Web app Cloud Run URL"
  value       = google_cloud_run_v2_service.web.uri
}

output "mobile_api_url" {
  value = "https://${var.domain_name}"
}

output "web_domain" {
  description = "Web app custom domain"
  value       = google_cloud_run_domain_mapping.web.name
}

output "firebase_auth_domain" {
  description = "Firebase Auth domain"
  value       = "${var.project_id}.firebaseapp.com"
}
