output "project_id" {
  value = var.project_id
}

output "firestore_database_id" {
  value = google_firestore_database.main.name
}

output "functions_service_url" {
  value = google_cloud_functions2_function.create_listing.service_config[0].uri
}

output "mobile_api_url" {
  value = "https://${var.domain_name}"
}
