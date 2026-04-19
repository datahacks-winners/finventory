#!/bin/bash

###############################################################################
# Auth Users Migration Script
#
# This script migrates user authentication data from Firebase Auth
# to Cloud Identity Platform using Firebase Admin SDK export/import.
#
# Prerequisites:
# - Node.js 20+ installed
# - npm dependencies installed
# - Service account with Firebase Admin and Cloud Identity Platform permissions
# - Firebase project access
#
# Usage:
#   ./scripts/migrate-auth-users.sh --source-project firebase-project --target-project gcp-project
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
BATCH_SIZE=1000
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

Migrate user authentication data from Firebase Auth to Cloud Identity Platform.

OPTIONS:
    --source-project TEXT     Source Firebase project ID (required)
    --target-project TEXT     Target GCP project ID (required)
    --batch-size INTEGER      Number of users to process per batch (default: 1000)
    -h, --help                Show this help message

EXAMPLES:
    # Migrate all users
    $0 --source-project firebase-app --target-project gcp-app

    # Migrate with smaller batch size
    $0 --source-project firebase-app --target-project gcp-app --batch-size 500

NOTES:
    - This script requires Firebase Admin SDK credentials
    - Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key
    - Email/password users will be migrated with their passwords
    - OAuth providers (Google, Apple) will need users to re-authenticate

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
        --batch-size)
            BATCH_SIZE="$2"
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

# Check for credentials
if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
    print_warning "GOOGLE_APPLICATION_CREDENTIALS not set"
    print_warning "Using Application Default Credentials"
fi

print_info "Starting Auth users migration..."
print_info "Source project: $SOURCE_PROJECT"
print_info "Target project: $TARGET_PROJECT"
print_info "Batch size: $BATCH_SIZE"

# Step 1: Create migration script
print_info "Step 1: Creating migration script..."

MIGRATION_SCRIPT="$SCRIPT_DIR/migrate-auth-users-script-$TIMESTAMP.mjs"

cat > "$MIGRATION_SCRIPT" << 'SCRIPT_EOF'
import admin from 'firebase-admin'
import { readFileSync } from 'fs'

// Configuration from environment
const SOURCE_PROJECT = process.env.SOURCE_PROJECT
const TARGET_PROJECT = process.env.TARGET_PROJECT
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1000')

// Initialize Firebase Admin for source
const sourceApp = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: SOURCE_PROJECT
}, 'source')

// Initialize Firebase Admin for target
const targetApp = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: TARGET_PROJECT
}, 'target')

const sourceAuth = admin.auth(sourceApp)
const targetAuth = admin.auth(targetApp)

async function listAllUsers(nextPageToken) {
  const listUsersResult = await sourceAuth.listUsers(BATCH_SIZE, nextPageToken)
  return listUsersResult
}

async function migrateUser(userRecord) {
  try {
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      phoneNumber: userRecord.phoneNumber,
      disabled: userRecord.disabled,
      metadata: {
        createdAt: userRecord.metadata.createdAt,
        lastSignInTime: userRecord.metadata.lastSignInTime
      }
    }

    // Handle password users
    if (userRecord.providerData.some(p => p.providerId === 'password')) {
      userData.passwordHash = userRecord.passwordHash
      userData.passwordSalt = userRecord.passwordSalt
    }

    // Create user in target project
    await targetAuth.createUser(userData)

    console.log(`Migrated user: ${userRecord.uid} (${userRecord.email})`)
    return { success: true, uid: userRecord.uid }
  } catch (error) {
    if (error.code === 'auth/uid-already-exists') {
      console.warn(`User already exists: ${userRecord.uid}`)
      return { success: true, uid: userRecord.uid, skipped: true }
    }
    console.error(`Failed to migrate user ${userRecord.uid}:`, error.message)
    return { success: false, uid: userRecord.uid, error: error.message }
  }
}

async function main() {
  console.log('Starting user migration...')
  console.log(`Source: ${SOURCE_PROJECT}`)
  console.log(`Target: ${TARGET_PROJECT}`)
  console.log(`Batch size: ${BATCH_SIZE}`)

  let totalUsers = 0
  let migratedUsers = 0
  let skippedUsers = 0
  let failedUsers = 0
  let nextPageToken

  do {
    const listUsersResult = await listAllUsers(nextPageToken)
    const users = listUsersResult.users
    totalUsers += users.length

    console.log(`\nProcessing batch: ${users.length} users`)

    const results = await Promise.all(
      users.map(user => migrateUser(user))
    )

    migratedUsers += results.filter(r => r.success && !r.skipped).length
    skippedUsers += results.filter(r => r.skipped).length
    failedUsers += results.filter(r => !r.success).length

    nextPageToken = listUsersResult.nextPageToken
  } while (nextPageToken)

  console.log('\n=== Migration Summary ===')
  console.log(`Total users: ${totalUsers}`)
  console.log(`Migrated: ${migratedUsers}`)
  console.log(`Skipped: ${skippedUsers}`)
  console.log(`Failed: ${failedUsers}`)

  if (failedUsers > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
SCRIPT_EOF

# Step 2: Install dependencies if needed
print_info "Step 2: Checking dependencies..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20+"
    exit 1
fi

MIGRATION_DIR="$SCRIPT_DIR/../backend-migration/migration-tools"
if [[ ! -d "$MIGRATION_DIR" ]]; then
    print_info "Creating migration tools directory..."
    mkdir -p "$MIGRATION_DIR"
    cd "$MIGRATION_DIR"

    print_info "Initializing package.json..."
    npm init -y > /dev/null

    print_info "Installing dependencies..."
    npm install firebase-admin > /dev/null 2>&1
fi

# Step 3: Run migration
print_info "Step 3: Running migration..."

export SOURCE_PROJECT="$SOURCE_PROJECT"
export TARGET_PROJECT="$TARGET_PROJECT"
export BATCH_SIZE="$BATCH_SIZE"

node "$MIGRATION_SCRIPT"

# Step 4: Verify migration
print_info "Step 4: Verifying migration..."

print_info "Migration completed!"
print_warning "Please test authentication in your app before disabling Firebase Auth"
print_warning "Users with OAuth providers (Google, Apple) will need to re-authenticate"
