#!/bin/bash

###############################################################################
# Firestore Data Migration Script
#
# This script migrates Firestore data from Firebase to GCP Native Firestore
# using the Firestore export/import API via gcloud.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Project IDs for source (Firebase) and target (GCP)
# - Sufficient permissions for Firestore export/import
#
# Usage:
#   ./scripts/migrate-firestore-data.sh --source-project firebase-project --target-project gcp-project
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
SOURCE_PROJECT=""
TARGET_PROJECT=""
BACKUP_BUCKET=""
COLLECTIONS=""
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Migrate Firestore data from Firebase to GCP Native Firestore.

OPTIONS:
    --source-project TEXT     Source Firebase project ID (required)
    --target-project TEXT     Target GCP project ID (required)
    --backup-bucket TEXT      GCS bucket for export files (optional, auto-created if not provided)
    --collections TEXT        Comma-separated list of collections to migrate (optional, migrates all if not provided)
    -h, --help                Show this help message

EXAMPLES:
    # Migrate all collections
    $0 --source-project firebase-app --target-project gcp-app

    # Migrate specific collections
    $0 --source-project firebase-app --target-project gcp-app --collections listings,users,orders

    # Use custom backup bucket
    $0 --source-project firebase-app --target-project gcp-app --backup-bucket my-migration-bucket

EOF
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --source-project)
            SOURCE_PROJECT="$2"
            shift 2
            ;;
        --target-project)
            TARGET_PROJECT="$2"
            shift 2
            ;;
        --backup-bucket)
            BACKUP_BUCKET="$2"
            shift 2
            ;;
        --collections)
            COLLECTIONS="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validation
if [[ -z "$SOURCE_PROJECT" ]]; then
    print_error "Source project ID is required"
    usage
fi

if [[ -z "$TARGET_PROJECT" ]]; then
    print_error "Target project ID is required"
    usage
fi

# Create backup bucket name if not provided
if [[ -z "$BACKUP_BUCKET" ]]; then
    BACKUP_BUCKET="${SOURCE_PROJECT}-firestore-export"
fi

print_info "Starting Firestore migration..."
print_info "Source project: $SOURCE_PROJECT"
print_info "Target project: $TARGET_PROJECT"
print_info "Backup bucket: $BACKUP_BUCKET"

# Step 1: Create GCS bucket for export
print_info "Step 1: Creating GCS bucket for export..."
gsutil ls -b gs://"$BACKUP_BUCKET" > /dev/null 2>&1 || {
    print_info "Creating bucket: gs://$BACKUP_BUCKET"
    gsutil mb -p "$SOURCE_PROJECT" gs://"$BACKUP_BUCKET"
    print_info "Bucket created successfully"
}

# Step 2: Export data from source project
print_info "Step 2: Exporting data from source project..."

EXPORT_PATH="gs://$BACKUP_BUCKET/firestore-export-$TIMESTAMP"

if [[ -n "$COLLECTIONS" ]]; then
    print_info "Exporting specific collections: $COLLECTIONS"
    gcloud firestore exports gs://"$BACKUP_BUCKET" \
        --project="$SOURCE_PROJECT" \
        --collection-ids="$COLLECTIONS"
else
    print_info "Exporting all collections"
    gcloud firestore exports gs://"$BACKUP_BUCKET" \
        --project="$SOURCE_PROJECT"
fi

print_info "Export completed"

# Step 3: Grant import permissions to target project service account
print_info "Step 3: Setting up permissions for target project..."

TARGET_NUMBER=$(gcloud projects describe "$TARGET_PROJECT" --format='value(projectNumber)')
SERVICE_ACCOUNT="service-$TARGET_NUMBER@gcp-sa-firestore.iam.gserviceaccount.com"

print_info "Granting storage.admin role to $SERVICE_ACCOUNT"
gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:roles/storage.objectAdmin" gs://"$BACKUP_BUCKET"

# Step 4: Import data to target project
print_info "Step 4: Importing data to target project..."

# Find the most recent export
EXPORT_URI=$(gsutil ls gs://"$BACKUP_BUCKET" | grep firestore-export | tail -1)

if [[ -z "$EXPORT_URI" ]]; then
    print_error "No export found in bucket"
    exit 1
fi

print_info "Importing from: $EXPORT_URI"

if [[ -n "$COLLECTIONS" ]]; then
    gcloud firestore imports "$EXPORT_URI" \
        --project="$TARGET_PROJECT" \
        --collection-ids="$COLLECTIONS"
else
    gcloud firestore imports "$EXPORT_URI" \
        --project="$TARGET_PROJECT"
fi

print_info "Import completed"

# Step 5: Verify data
print_info "Step 5: Verifying imported data..."

# Check if collections exist in target project
if [[ -n "$COLLECTIONS" ]]; then
    IFS=',' read -ra COLS <<< "$COLLECTIONS"
    for collection in "${COLS[@]}"; do
        COUNT=$(gcloud firestore collections list --project="$TARGET_PROJECT" | grep -c "$collection" || true)
        if [[ $COUNT -gt 0 ]]; then
            print_info "Collection '$collection' verified in target project"
        else
            print_warning "Collection '$collection' not found in target project"
        fi
    done
else
    TOTAL_COLLECTIONS=$(gcloud firestore collections list --project="$TARGET_PROJECT" | wc -l)
    print_info "Total collections in target project: $TOTAL_COLLECTIONS"
fi

# Step 6: Cleanup (optional - uncomment to auto-delete old exports)
# print_info "Step 6: Cleaning up old exports..."
# gsutil rm -r gs://"$BACKUP_BUCKET"/firestore-export-*"$TIMESTAMP"

print_info "Migration completed successfully!"
print_info "Export location: $EXPORT_URI"
print_warning "Please verify your data in the GCP Console before deleting the source"
print_warning "https://console.cloud.google.com/firestore/data?project=$TARGET_PROJECT"
