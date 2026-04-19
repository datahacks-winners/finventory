resource "google_compute_network" "vpc" {
  name                    = "${var.project_id}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "functions" {
  name          = "${var.project_id}-functions-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  stack_type    = "IPV4_ONLY"
  purpose       = "PRIVATE"
  role          = "ACTIVE"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.0.2.0/24"
  }

  log_config {
    aggregation_interval = "INTERVAL_5_MIN"
    flow_sampling        = 0.1
  }
}

resource "google_compute_subnetwork" "cloud_run" {
  name          = "${var.project_id}-cloudrun-subnet"
  ip_cidr_range = "10.0.3.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  purpose       = "PRIVATE"
  role          = "ACTIVE"
}

resource "google_compute_router" "router" {
  name    = "${var.project_id}-router"
  region  = var.region
  network = google_compute_network.vpc.id

  depends_on = [
    google_compute_subnetwork.functions,
    google_compute_subnetwork.cloud_run
  ]
}

resource "google_compute_address" "nat_ip" {
  name         = "${var.project_id}-nat-ip"
  region       = var.region
  address_type = "EXTERNAL"
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.project_id}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "MANUAL_ONLY"
  nat_ips                            = [google_compute_address.nat_ip.id]
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.functions.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  depends_on = [google_compute_router.router]
}
