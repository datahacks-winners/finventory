output "name" {
  value = google_cloudfunctions2_function.function.name
}

output "uri" {
  value = google_cloudfunctions2_function.function.service_config[0].uri
}
