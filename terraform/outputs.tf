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

output "vector_db_host" {
  description = "Vector store PostgreSQL host"
  value       = google_sql_database_instance.vector_store.ip_address.0.ip_address
}

output "vector_db_name" {
  description = "Vector store database name"
  value       = google_sql_database.rag_db.name
}

output "vector_db_user" {
  description = "Vector store database user"
  value       = google_sql_user.rag_user.name
}

output "vector_db_secret" {
  description = "Secret Manager path for DB credentials"
  value       = google_secret_manager_secret.db_connection.id
}
