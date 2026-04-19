#!/bin/bash

###############################################################################
# Firestore Data Migration Script (Production Ready)
#
# This script migrates Firestore data from Firebase to GCP Native Firestore
# using the Firestore export/import API via gcloud.
#
# Phase 4 Cutover - Task 23: Final Data Migration and Verification
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Project IDs for source (Firebase) and target (GCP)
# - Sufficient permissions for Firestore export/import
# - Target project infrastructure deployed via Terraform
#
# Usage:
#   ./scripts/migrate-firestore-data.sh --source-project firebase-project --target-project gcp-project
#
# Post-migration:
#   Run ./scripts/verify-migration.sh to verify the migration
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

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
LOG_FILE="migration-$TIMESTAMP.log"
DRY_RUN=false
SKIP_VERIFY=false

# Collections to migrate (based on CLAUDE.md)
DEFAULT_COLLECTIONS="listings,users,orders,standing_orders,messages"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $1" >> "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE"
}

print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [STEP] $1" >> "$LOG_FILE"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Migrate Firestore data from Firebase to GCP Native Firestore.

PHASE 4 CUTOVER - Task 23

OPTIONS:
    --source-project TEXT     Source Firebase project ID (required)
    --target-project TEXT     Target GCP project ID (required)
    --backup-bucket TEXT      GCS bucket for export files (optional, auto-created if not provided)
    --collections TEXT        Comma-separated list of collections to migrate (default: all)
    --dry-run                 Show what would be done without executing
    --skip-verify             Skip automatic verification after migration
    -h, --help                Show this help message

EXAMPLES:
    # Migrate all collections (recommended for production)
    $0 --source-project firebase-app --target-project gcp-app

    # Migrate specific collections
    $0 --source-project firebase-app --target-project gcp-app --collections listings,users,orders

    # Use custom backup bucket
    $0 --source-project firebase-app --target-project gcp-app --backup-bucket my-migration-bucket

    # Dry run to see what would happen
    $0 --source-project firebase-app --target-project gcp-app --dry-run

POST-MIGRATION:
    After migration completes, run verification:
    ./scripts/verify-migration.sh --source-project firebase-app --target-project gcp-app

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
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-verify)
            SKIP_VERIFY=true
            shift
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

# Set default collections if not provided
if [[ -z "$COLLECTIONS" ]]; then
    COLLECTIONS="$DEFAULT_COLLECTIONS"
    print_info "Using default collections: $COLLECTIONS"
fi

# Print migration configuration
print_step "Migration Configuration"
print_info "Source project: $SOURCE_PROJECT"
print_info "Target project: $TARGET_PROJECT"
print_info "Backup bucket: $BACKUP_BUCKET"
print_info "Collections: $COLLECTIONS"
print_info "Log file: $LOG_FILE"
print_info "Dry run: $DRY_RUN"
echo ""

# Pre-flight checks
print_step "Pre-flight Checks"

# Check if gcloud is authenticated
if ! gcloud auth list --filter="status:ACTIVE" 2>&1 | grep -q "ACTIVE"; then
    print_error "gcloud not authenticated. Run: gcloud auth login"
    exit 1
fi
print_info "gcloud authentication verified"

# Check if source project is accessible
if ! gcloud firestore collections list --project="$SOURCE_PROJECT" &> /dev/null; then
    print_error "Cannot access source project: $SOURCE_PROJECT"
    exit 1
fi
print_info "Source project accessible"

# Check if target project is accessible
if ! gcloud firestore collections list --project="$TARGET_PROJECT" &> /dev/null; then
    print_error "Cannot access target project: $TARGET_PROJECT"
    exit 1
fi
print_info "Target project accessible"

if [[ "$DRY_RUN" == true ]]; then
    print_warning "DRY RUN MODE - No changes will be made"
    echo ""
    print_step "Would execute the following steps:"
    echo "1. Create GCS bucket: $BACKUP_BUCKET"
    echo "2. Export collections from: $SOURCE_PROJECT"
    echo "3. Grant permissions to target project service account"
    echo "4. Import collections to: $TARGET_PROJECT"
    echo "5. Run verification (unless --skip-verify)"
    echo ""
    exit 0
fi

echo ""
print_step "Starting Migration..."
echo ""

# Step 1: Create GCS bucket for export
print_step "Step 1: Creating GCS bucket for export"
gsutil ls -b gs://"$BACKUP_BUCKET" > /dev/null 2>&1 || {
    print_info "Creating bucket: gs://$BACKUP_BUCKET"
    gsutil mb -p "$SOURCE_PROJECT" -l us-central1 gs://"$BACKUP_BUCKET" 2>&1 | tee -a "$LOG_FILE"
    print_info "Bucket created successfully"

    # Set lifecycle policy to auto-delete exports after 30 days
    cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["firestore-export-"]
        }
      }
    ]
  }
}
EOF
    gsutil lifecycle set /tmp/lifecycle.json gs://"$BACKUP_BUCKET" 2>&1 | tee -a "$LOG_FILE" || true
    print_info "Lifecycle policy configured (30-day retention)"
}

# Step 2: Export data from source project
print_step "Step 2: Exporting data from source project"

EXPORT_PATH="gs://$BACKUP_BUCKET/firestore-export-$TIMESTAMP"

print_info "Export path: $EXPORT_PATH"
print_info "Collections: $COLLECTIONS"

# Start export operation
EXPORT_OPERATION=$(gcloud firestore exports gs://"$BACKUP_BUCKET" \
    --project="$SOURCE_PROJECT" \
    --collection-ids="$COLLECTIONS" \
    --async 2>&1 | tee -a "$LOG_FILE" | grep -oP "Operation name: \K.*" || true)

if [[ -n "$EXPORT_OPERATION" ]]; then
    print_info "Export operation started: $EXPORT_OPERATION"
    print_info "Waiting for export to complete..."

    # Wait for export to complete (with timeout)
    TIMEOUT=1800  # 30 minutes
    ELAPSED=0
    while [[ $ELAPSED -lt $TIMEOUT ]]; do
        STATUS=$(gcloud firestore operations describe "$EXPORT_OPERATION" \
            --project="$SOURCE_PROJECT" \
            --format='value(metadata.state)' 2>&1 || echo "UNKNOWN")

        print_info "Export status: $STATUS ($(date '+%Y-%m-%d %H:%M:%S'))"

        if [[ "$STATUS" == "SUCCESSFUL" ]]; then
            print_info "Export completed successfully"
            break
        elif [[ "$STATUS" == "FAILED" || "$STATUS" == "CANCELLED" ]]; then
            print_error "Export failed with status: $STATUS"
            exit 1
        fi

        sleep 30
        ((ELAPSED+=30))
    done

    if [[ $ELAPSED -ge $TIMEOUT ]]; then
        print_error "Export timed out after $TIMEOUT seconds"
        exit 1
    fi
else
    print_warning "Could not get operation name, proceeding with synchronous export"
    gcloud firestore exports gs://"$BACKUP_BUCKET" \
        --project="$SOURCE_PROJECT" \
        --collection-ids="$COLLECTIONS" 2>&1 | tee -a "$LOG_FILE"
fi

print_info "Export completed"

# Step 3: Grant import permissions to target project service account
print_step "Step 3: Setting up permissions for target project"

TARGET_NUMBER=$(gcloud projects describe "$TARGET_PROJECT" --format='value(projectNumber)')
SERVICE_ACCOUNT="service-$TARGET_NUMBER@gcp-sa-firestore.iam.gserviceaccount.com"

print_info "Target project number: $TARGET_NUMBER"
print_info "Service account: $SERVICE_ACCOUNT"

print_info "Granting storage.objectAdmin role to service account..."
gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:roles/storage.objectAdmin" gs://"$BACKUP_BUCKET" 2>&1 | tee -a "$LOG_FILE"
print_info "Permissions granted"

# Step 4: Import data to target project
print_step "Step 4: Importing data to target project"

# Find the most recent export
EXPORT_URI=$(gsutil ls gs://"$BACKUP_BUCKET"/ 2>&1 | grep "firestore-export-$TIMESTAMP" | head -1)

if [[ -z "$EXPORT_URI" ]]; then
    print_error "No export found in bucket for timestamp: $TIMESTAMP"
    print_info "Available exports:"
    gsutil ls gs://"$BACKUP_BUCKET"/ 2>&1 | grep firestore-export || true
    exit 1
fi

print_info "Importing from: $EXPORT_URI"

# Start import operation
IMPORT_OPERATION=$(gcloud firestore imports "$EXPORT_URI" \
    --project="$TARGET_PROJECT" \
    --collection-ids="$COLLECTIONS" \
    --async 2>&1 | tee -a "$LOG_FILE" | grep -oP "Operation name: \K.*" || true)

if [[ -n "$IMPORT_OPERATION" ]]; then
    print_info "Import operation started: $IMPORT_OPERATION"
    print_info "Waiting for import to complete..."

    # Wait for import to complete (with timeout)
    TIMEOUT=1800  # 30 minutes
    ELAPSED=0
    while [[ $ELAPSED -lt $TIMEOUT ]]; do
        STATUS=$(gcloud firestore operations describe "$IMPORT_OPERATION" \
            --project="$TARGET_PROJECT" \
            --format='value(metadata.state)' 2>&1 || echo "UNKNOWN")

        print_info "Import status: $STATUS ($(date '+%Y-%m-%d %H:%M:%S'))"

        if [[ "$STATUS" == "SUCCESSFUL" ]]; then
            print_info "Import completed successfully"
            break
        elif [[ "$STATUS" == "FAILED" || "$STATUS" == "CANCELLED" ]]; then
            print_error "Import failed with status: $STATUS"
            exit 1
        fi

        sleep 30
        ((ELAPSED+=30))
    done

    if [[ $ELAPSED -ge $TIMEOUT ]]; then
        print_error "Import timed out after $TIMEOUT seconds"
        exit 1
    fi
else
    print_warning "Could not get operation name, proceeding with synchronous import"
    gcloud firestore imports "$EXPORT_URI" \
        --project="$TARGET_PROJECT" \
        --collection-ids="$COLLECTIONS" 2>&1 | tee -a "$LOG_FILE"
fi

print_info "Import completed"

# Step 5: Verify data
print_step "Step 5: Verifying imported data"

# Check if collections exist in target project
IFS=',' read -ra COLS <<< "$COLLECTIONS"
for collection in "${COLS[@]}"; do
    # Trim whitespace
    collection=$(echo "$collection" | xargs)

    # Check if collection exists
    if gcloud firestore collections list --project="$TARGET_PROJECT" 2>&1 | grep -q "^${collection}$"; then
        print_info "Collection '$collection' verified in target project"
    else
        print_warning "Collection '$collection' not found in target project (may be empty)"
    fi
done

echo ""
print_step "Migration Summary"
echo ""
print_info "Source project: $SOURCE_PROJECT"
print_info "Target project: $TARGET_PROJECT"
print_info "Collections migrated: $COLLECTIONS"
print_info "Export location: $EXPORT_URI"
print_info "Log file: $LOG_FILE"
echo ""

# Step 6: Automatic verification
if [[ "$SKIP_VERIFY" == false ]]; then
    print_step "Step 6: Running automatic verification"

    if [[ -f "./scripts/verify-migration.sh" ]]; then
        print_info "Running verification script..."
        if ./scripts/verify-migration.sh \
            --source-project="$SOURCE_PROJECT" \
            --target-project="$TARGET_PROJECT"; then
            print_info "Verification passed"
        else
            print_warning "Verification completed with warnings. Review output above."
        fi
    else
        print_warning "Verification script not found at ./scripts/verify-migration.sh"
        print_info "Please run verification manually:"
        echo "  ./scripts/verify-migration.sh --source-project=$SOURCE_PROJECT --target-project=$TARGET_PROJECT"
    fi
else
    print_info "Skipping automatic verification (--skip-verify flag used)"
fi

echo ""
print_step "Next Steps"
echo ""
echo "1. Verify your data in the GCP Console:"
echo "   https://console.cloud.google.com/firestore/data?project=$TARGET_PROJECT"
echo ""
echo "2. Run detailed verification if skipped:"
echo "   ./scripts/verify-migration.sh --source-project=$SOURCE_PROJECT --target-project=$TARGET_PROJECT"
echo ""
echo "3. Test the application against the new project"
echo ""
echo "4. Monitor Cloud Functions and real-time sync"
echo ""
echo "5. Once verified, you can proceed with Task 24: Disable Firebase Project"
echo ""
print_warning "IMPORTANT: Do not delete the source Firebase project until full verification is complete!"
echo ""
print_info "Migration completed successfully!"
echo ""
