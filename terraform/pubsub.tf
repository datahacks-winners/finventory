# Cloud Pub/Sub Topics and Subscriptions
# Real-time events for inventory updates

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
