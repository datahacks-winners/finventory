# Cloud Pub/Sub Topics and Subscriptions
# Real-time events and mobile push notifications

# Topic: Inventory updates for real-time sync
resource "google_pubsub_topic" "inventory_updates" {
  name = "inventory-updates"

  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }
}

# Topic: New listings for standing order matching
resource "google_pubsub_topic" "new_listings" {
  name = "new-listings"

  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }
}

# Topic: Order updates for buyer/seller notifications
resource "google_pubsub_topic" "order_updates" {
  name = "order-updates"

  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }
}

# JSON Schema for inventory update messages
resource "google_pubsub_schema" "inventory_update" {
  name       = "inventory-update-schema"
  type       = "AVRO"
  definition = <<-EOF
    {
      "type": "record",
      "name": "InventoryUpdate",
      "namespace": "finventory.inventory",
      "fields": [
        {"name": "listing_id", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "status", "type": ["string", "null"]},
        {"name": "timestamp", "type": "long"}
      ]
    }
  EOF
}

# JSON Schema for new listing messages
resource "google_pubsub_schema" "new_listing" {
  name       = "new-listing-schema"
  type       = "AVRO"
  definition = <<-EOF
    {
      "type": "record",
      "name": "NewListing",
      "namespace": "finventory.listings",
      "fields": [
        {"name": "listing_id", "type": "string"},
        {"name": "seller_id", "type": "string"},
        {"name": "species", "type": "string"},
        {"name": "grade", "type": "string"},
        {"name": "latitude", "type": "double"},
        {"name": "longitude", "type": "double"},
        {"name": "geohash", "type": "string"},
        {"name": "timestamp", "type": "long"}
      ]
    }
  EOF
}

# JSON Schema for order update messages
resource "google_pubsub_schema" "order_update" {
  name       = "order-update-schema"
  type       = "AVRO"
  definition = <<-EOF
    {
      "type": "record",
      "name": "OrderUpdate",
      "namespace": "finventory.orders",
      "fields": [
        {"name": "order_id", "type": "string"},
        {"name": "listing_id", "type": "string"},
        {"name": "buyer_id", "type": "string"},
        {"name": "seller_id", "type": "string"},
        {"name": "status", "type": "string"},
        {"name": "timestamp", "type": "long"}
      ]
    }
  EOF
}

# Subscription: Mobile push notification service
resource "google_pubsub_subscription" "mobile_push" {
  name       = "mobile-push-subscription"
  topic      = google_pubsub_topic.order_updates.name
  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "${google_cloudfunctions2_function.send_push_notification.service_config[0].uri}/push"
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
      audience              = google_cloudfunctions2_function.send_push_notification.service_config[0].uri
    }
  }

  # Only push order status updates
  filter = "attributes.event_type = 'status_update'"

  message_retention_duration = "86400s" # 24 hours
}

# Subscription: Standing order matcher service
resource "google_pubsub_subscription" "standing_order_matcher" {
  name  = "standing-order-matcher-subscription"
  topic = google_pubsub_topic.new_listings.name

  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "${google_cloudfunctions2_function.match_standing_orders.service_config[0].uri}/match"
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
      audience              = google_cloudfunctions2_function.match_standing_orders.service_config[0].uri
    }
  }

  message_retention_duration = "86400s"
}
