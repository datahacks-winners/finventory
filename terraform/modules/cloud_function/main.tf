resource "google_cloud_functions2_function" "function" {
  name        = var.name
  location    = var.location
  description = var.description

  build_config {
    runtime     = var.runtime
    entry_point = var.entry_point
    environment_variables = var.environment_variables
    source {
      storage_source {
        bucket = var.source_bucket
        object = var.source_object
      }
    }
  }

  service_config {
    available_memory   = var.memory
    timeout_seconds    = var.timeout
    max_instance_count = var.max_instances
    min_instances      = var.min_instances
  }

  dynamic "event_trigger" {
    for_each = var.event_triggers
    content {
      trigger     = event_trigger.trigger
      event_type = event_trigger.event_type
      resource    = event_trigger.resource
    }
  }
}
