# Cloud SQL PostgreSQL with pgvector extension for RAG

resource "google_project_service" "sql" {
  project            = google_project.default.project_id
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_sql_database_instance" "vector_store" {
  name             = "${var.project_id}-vector-store"
  database_version = "POSTGRES_15"
  project          = google_project.default.project_id
  region           = var.region

  depends_on = [google_project_service.sql]

  settings {
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_size         = 10
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled = false
    }

    maintenance_window {
      day  = 1
      hour = 0
    }

    insights_config {
      query_insights_enabled = false
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "rag_db" {
  name     = "rag_vectors"
  instance = google_sql_database_instance.vector_store.name
  project  = google_project.default.project_id
}

resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "google_sql_user" "rag_user" {
  name     = "rag_user"
  instance = google_sql_database_instance.vector_store.name
  project  = google_project.default.project_id
  password = random_password.db_password.result
}

# Store DB credentials in Secret Manager
resource "google_secret_manager_secret" "db_connection" {
  project   = google_project.default.project_id
  secret_id = "vector-db-connection"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "db_connection" {
  secret    = google_secret_manager_secret.db_connection.id
  secret_data = jsonencode({
    host     = google_sql_database_instance.vector_store.ip_address.0.ip_address
    port     = 5432
    database = google_sql_database.rag_db.name
    user     = google_sql_user.rag_user.name
    password = google_sql_user.rag_user.password
  })
}

# Enable pgvector extension via local-exec
resource "null_resource" "enable_pgvector" {
  depends_on = [google_sql_database.rag_db, google_sql_user.rag_user]

  provisioner "local-exec" {
    command = <<-EOT
      gcloud sql connect ${google_sql_database_instance.vector_store.name} \
        --database=${google_sql_database.rag_db.name} \
        --user=${google_sql_user.rag_user.name} \
        --quiet <<'SQL'
      CREATE EXTENSION IF NOT EXISTS vector;
      
      CREATE TABLE IF NOT EXISTS item_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        content TEXT,
        url TEXT,
        embedding vector(768),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX ON item_embeddings USING ivfflat (embedding vector_cosine_ops);
      CREATE INDEX idx_item_embeddings_item_id ON item_embeddings(item_id);
      
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${google_sql_user.rag_user.name};
      SQL
    EOT
  }
}
