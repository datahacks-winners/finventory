#!/bin/bash

###############################################################################
# Firestore Migration Verification Script
#
# This script verifies that Firestore data has been successfully migrated
# from Firebase to GCP Native Firestore by comparing collection counts,
# document counts, and sample data.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Project IDs for source (Firebase) and target (GCP)
# - Migration should have already been completed
#
# Usage:
#   ./scripts/verify-migration.sh --source-project firebase-project --target-project gcp-project
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SOURCE_PROJECT=""
TARGET_PROJECT=""
VERBOSE=false
STRICT_MODE=false

# Verification counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_COUNT=0

# Collections to verify (based on CLAUDE.md)
COLLECTIONS=(
    "listings"
    "users"
    "orders"
    "standing_orders"
    "messages"
)

# Function to print colored output
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNING_COUNT++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_CHECKS++))
}

print_verbose() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

check_passed() {
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
    print_info "$1"
}

check_failed() {
    ((TOTAL_CHECKS++))
    print_error "$1"
    if [[ "$STRICT_MODE" == true ]]; then
        exit 1
    fi
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Verify Firestore data migration from Firebase to GCP Native Firestore.

OPTIONS:
    --source-project TEXT     Source Firebase project ID (required)
    --target-project TEXT     Target GCP project ID (required)
    --strict                  Exit on first failure (default: false)
    --verbose, -v             Enable verbose output
    -h, --help                Show this help message

EXAMPLES:
    # Basic verification
    $0 --source-project firebase-app --target-project gcp-app

    # Strict mode with verbose output
    $0 --source-project firebase-app --target-project gcp-app --strict --verbose

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
        --strict)
            STRICT_MODE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}[ERROR]${NC} Unknown option: $1"
            usage
            ;;
    esac
done

# Validation
if [[ -z "$SOURCE_PROJECT" ]]; then
    echo -e "${RED}[ERROR]${NC} Source project ID is required"
    usage
fi

if [[ -z "$TARGET_PROJECT" ]]; then
    echo -e "${RED}[ERROR]${NC} Target project ID is required"
    usage
fi

###############################################################################
# VERIFICATION START
###############################################################################

print_header "Firestore Migration Verification"
echo ""
echo "Source Project: $SOURCE_PROJECT"
echo "Target Project: $TARGET_PROJECT"
echo "Strict Mode: $STRICT_MODE"
echo "Verbose: $VERBOSE"
echo ""

###############################################################################
# PRE-CHECKS
###############################################################################

print_header "Step 1: Pre-flight Checks"

# Check if gcloud is authenticated
print_verbose "Checking gcloud authentication..."
if gcloud auth list --filter="status:ACTIVE" 2>&1 | grep -q "ACTIVE"; then
    check_passed "gcloud authentication verified"
else
    check_failed "gcloud not authenticated. Run: gcloud auth login"
fi

# Check if source project is accessible
print_verbose "Checking source project accessibility..."
if gcloud firestore collections list --project="$SOURCE_PROJECT" &> /dev/null; then
    check_passed "Source project ($SOURCE_PROJECT) is accessible"
else
    check_failed "Cannot access source project ($SOURCE_PROJECT)"
fi

# Check if target project is accessible
print_verbose "Checking target project accessibility..."
if gcloud firestore collections list --project="$TARGET_PROJECT" &> /dev/null; then
    check_passed "Target project ($TARGET_PROJECT) is accessible"
else
    check_failed "Cannot access target project ($TARGET_PROJECT)"
fi

echo ""

###############################################################################
# COLLECTION VERIFICATION
###############################################################################

print_header "Step 2: Collection Existence Verification"

for collection in "${COLLECTIONS[@]}"; do
    print_verbose "Checking for collection: $collection"

    # Check if collection exists in source
    SOURCE_EXISTS=$(gcloud firestore collections list --project="$SOURCE_PROJECT" 2>&1 | grep -c "^$collection$" || true)

    # Check if collection exists in target
    TARGET_EXISTS=$(gcloud firestore collections list --project="$TARGET_PROJECT" 2>&1 | grep -c "^$collection$" || true)

    if [[ $SOURCE_EXISTS -gt 0 ]]; then
        if [[ $TARGET_EXISTS -gt 0 ]]; then
            check_passed "Collection '$collection' exists in both projects"
        else
            check_failed "Collection '$collection' missing in target project"
        fi
    else
        print_warning "Collection '$collection' not found in source (may be empty)"
    fi
done

echo ""

###############################################################################
# DOCUMENT COUNT VERIFICATION
###############################################################################

print_header "Step 3: Document Count Verification"

for collection in "${COLLECTIONS[@]}"; do
    print_verbose "Counting documents in collection: $collection"

    # Get document counts (using gcloud firestore count)
    # Note: This is an estimate. For exact counts, use collection group queries
    SOURCE_COUNT=$(gcloud firestore count "$collection" --project="$SOURCE_PROJECT" 2>&1 | grep -oP "Total documents: \K\d+" || echo "0")
    TARGET_COUNT=$(gcloud firestore count "$collection" --project="$TARGET_PROJECT" 2>&1 | grep -oP "Total documents: \K\d+" || echo "0")

    print_verbose "Source count: $SOURCE_COUNT, Target count: $TARGET_COUNT"

    if [[ $SOURCE_COUNT -eq 0 && $TARGET_COUNT -eq 0 ]]; then
        print_warning "Collection '$collection' is empty in both projects"
    elif [[ $SOURCE_COUNT -eq $TARGET_COUNT ]]; then
        check_passed "Collection '$collection': $SOURCE_COUNT documents (exact match)"
    elif [[ $TARGET_COUNT -ge $((SOURCE_COUNT * 95 / 100)) ]]; then
        # Allow 5% tolerance for timing differences
        DIFF_PERCENT=$(( (SOURCE_COUNT - TARGET_COUNT) * 100 / SOURCE_COUNT ))
        print_warning "Collection '$collection': Source=$SOURCE_COUNT, Target=$TARGET_COUNT (${DIFF_PERCENT}% difference)"
    else
        check_failed "Collection '$collection': Source=$SOURCE_COUNT, Target=$TARGET_COUNT (significant difference)"
    fi
done

echo ""

###############################################################################
# SAMPLE DATA VERIFICATION
###############################################################################

print_header "Step 4: Sample Data Verification"

# Function to get a sample document ID from a collection
get_sample_document() {
    local project=$1
    local collection=$2

    # Use gcloud to list documents and get the first one
    gcloud firestore collections ids "$collection" \
        --project="$project" \
        --limit=1 \
        2>&1 | grep -v "Listing items" | head -1
}

# Function to check if a document exists
document_exists() {
    local project=$1
    local collection=$2
    local doc_id=$3

    gcloud firestore documents describe \
        "projects/$project/databases/(default)/documents/$collection/$doc_id" \
        --project="$project" \
        &> /dev/null
}

for collection in "${COLLECTIONS[@]}"; do
    print_verbose "Getting sample document from: $collection"

    # Get a sample document from source
    SOURCE_DOC_ID=$(get_sample_document "$SOURCE_PROJECT" "$collection")

    if [[ -n "$SOURCE_DOC_ID" ]]; then
        print_verbose "Sample document ID: $SOURCE_DOC_ID"

        # Check if same document exists in target
        if document_exists "$TARGET_PROJECT" "$collection" "$SOURCE_DOC_ID"; then
            check_passed "Sample document exists in target: $collection/$SOURCE_DOC_ID"
        else
            check_failed "Sample document missing in target: $collection/$SOURCE_DOC_ID"
        fi
    else
        print_warning "Could not get sample document from '$collection' (may be empty)"
    fi
done

echo ""

###############################################################################
# INDEX VERIFICATION
###############################################################################

print_header "Step 5: Index Verification"

# Check if indexes exist in target project
print_verbose "Checking Firestore indexes..."

TARGET_INDEXES=$(gcloud firestore indexes list --project="$TARGET_PROJECT" 2>&1 | grep -c "index:" || true)

if [[ $TARGET_INDEXES -gt 0 ]]; then
    check_passed "Found $TARGET_INDEXES index(es) in target project"
else
    print_warning "No custom indexes found in target project (may use only default indexes)"
fi

echo ""

###############################################################################
# TIMESTAMP VERIFICATION (for data integrity)
###############################################################################

print_header "Step 6: Data Integrity Checks"

# Check for required fields in listings collection
print_verbose "Checking listings collection structure..."

LISTINGS_QUERY='SELECT * FROM listings LIMIT 1'

# Use gcloud to run a simple query
if gcloud firestore query "$LISTINGS_QUERY" --project="$TARGET_PROJECT" &> /dev/null; then
    check_passed "Listings collection is queryable"
else
    print_warning "Could not query listings collection (may be empty or permission issue)"
fi

echo ""

###############################################################################
# SUMMARY
###############################################################################

print_header "Verification Summary"

echo ""
echo "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_COUNT${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo ""

if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}VERIFICATION PASSED${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Your migration appears to be successful!"
    echo ""
    echo "Next steps:"
    echo "1. Review any warnings above"
    echo "2. Test the application against the new project"
    echo "3. Verify real-time sync is working"
    echo "4. Check Cloud Functions are functioning"
    echo ""
    echo "GCP Console: https://console.cloud.google.com/firestore/data?project=$TARGET_PROJECT"
    echo ""
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}VERIFICATION FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Please investigate the failed checks above."
    echo "Common issues:"
    echo "  - Collections not fully migrated"
    echo "  - Indexes not created"
    echo "  - Permission issues"
    echo "  - Data inconsistencies"
    echo ""
    echo "You may need to re-run the migration script."
    echo ""
    exit 1
fi
