output "project_id" {
  value = var.project_id
}

output "firestore_database_id" {
  value = google_firestore_database.main.name
}

output "functions_service_url" {
  value = module.create_listing_function.uri
}

output "mobile_api_url" {
  value = "https://${var.domain_name}"
}
