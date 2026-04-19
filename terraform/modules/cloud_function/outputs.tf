output "name" {
  value = google_cloud_functions2_function.function.name
}

output "uri" {
  value = google_cloud_functions2_function.function.service_config[0].uri
}
