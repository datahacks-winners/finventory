# Cloud Storage Buckets
# Listing photos, certificates, profile photos, and logs

# Bucket: Listing photos (public read, authenticated write)
resource "google_storage_bucket" "listing_photos" {
  name                        = "${var.project_id}-listing-photos"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  cors {
    origin          = ["*"]
    method          = ["GET"]
    response_header = ["Content-Type", "Access-Control-Allow-Origin"]
    max_age_seconds = 3600
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }
}

# Bucket: Sushi certificates (private, authenticated access)
resource "google_storage_bucket" "certificates" {
  name                        = "${var.project_id}-certificates"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365 # Keep certificates for 1 year after expiry
    }
    action {
      type = "Delete"
    }
  }
}

# Bucket: Profile photos (public read, owner write)
resource "google_storage_bucket" "profile_photos" {
  name                        = "${var.project_id}-profile-photos"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET"]
    response_header = ["Content-Type", "Access-Control-Allow-Origin"]
    max_age_seconds = 3600
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }
}

# Bucket: Application logs (centralized logging)
resource "google_storage_bucket" "logs" {
  name                        = "${var.project_id}-logs"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 90 # Retain logs for 90 days
    }
    action {
      type = "Delete"
    }
  }
}

# IAM binding for listing photos (public read)
resource "google_storage_bucket_iam_member" "listing_photos_public_read" {
  bucket = google_storage_bucket.listing_photos.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# IAM binding for authenticated users to upload listing photos
resource "google_storage_bucket_iam_member" "listing_photos_upload" {
  bucket = google_storage_bucket.listing_photos.name
  role   = "roles/storage.objectCreator"
  member = "allAuthenticatedUsers"
}

# IAM binding for profile photos (public read)
resource "google_storage_bucket_iam_member" "profile_photos_public_read" {
  bucket = google_storage_bucket.profile_photos.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# IAM binding for logs bucket (Cloud Functions access)
resource "google_storage_bucket_iam_member" "logs_writer" {
  bucket = google_storage_bucket.logs.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.cloud_functions.email}"
}
