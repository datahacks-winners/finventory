resource "google_project" "default" {
  name       = var.project_id
  project_id = var.project_id
  org_id     = var.org_id

  deletion_policy = "DELETE"
}

# Enable required APIs
resource "google_project_service" "firestore" {
  project            = google_project.default.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "functions" {
  project = google_project.default.project_id
  service = "cloudfunctions.googleapis.com"
}

resource "google_project_service" "pubsub" {
  project = google_project.default.project_id
  service = "pubsub.googleapis.com"
}

resource "google_project_service" "identityplatform" {
  project = google_project.default.project_id
  service = "identityplatform.googleapis.com"
}

resource "google_project_service" "run" {
  project = google_project.default.project_id
  service = "run.googleapis.com"
}

resource "google_project_service" "secretmanager" {
  project = google_project.default.project_id
  service = "secretmanager.googleapis.com"
}

resource "google_project_service" "storage" {
  project = google_project.default.project_id
  service = "storage.googleapis.com"
}

resource "google_project_service" "compute" {
  project = google_project.default.project_id
  service = "compute.googleapis.com"
}
