resource "google_cloudfunctions2_function" "function" {
  name        = var.name
  location    = var.location
  description = var.description

  build_config {
    runtime               = var.runtime
    entry_point           = var.entry_point
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
  }

  dynamic "event_trigger" {
    for_each = var.event_triggers
    content {
      event_type   = event_trigger.value.event_type
      pubsub_topic = event_trigger.value.resource
      retry_policy = "RETRY_POLICY_RETRY"
    }
  }
}
