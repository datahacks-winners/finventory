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

output "web_url" {
  description = "Web app Cloud Run URL"
  value       = google_cloud_run_v2_service.web.uri
}

output "web_domain" {
  description = "Web app custom domain"
  value       = google_cloud_run_domain_mapping.web.name
}

# Output the GitHub Actions service account key (sensitive - save to GitHub secrets)
output "github_actions_sa_key" {
  value     = google_service_account_key.github_actions.private_key
  sensitive = true
}
