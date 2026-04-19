# Migration Scripts

This directory contains scripts for migrating data from Firebase to GCP Native services as part of Phase 4 Cutover.

## Scripts

### 1. `migrate-firestore-data.sh`

**Purpose**: Migrates Firestore data from Firebase project to GCP Native Firestore.

**Task**: Phase 4 Cutover - Task 23

**Usage**:
```bash
# Basic migration (recommended for production)
./scripts/migrate-firestore-data.sh \
  --source-project firebase-project-id \
  --target-project gcp-project-id

# Migrate specific collections
./scripts/migrate-firestore-data.sh \
  --source-project firebase-project-id \
  --target-project gcp-project-id \
  --collections listings,users,orders

# Dry run to preview
./scripts/migrate-firestore-data.sh \
  --source-project firebase-project-id \
  --target-project gcp-project-id \
  --dry-run
```

**Features**:
- Pre-flight checks (authentication, project access)
- Asynchronous export/import with progress monitoring
- Automatic GCS bucket creation with lifecycle policies
- Comprehensive logging to timestamped log files
- Automatic verification after migration (unless `--skip-verify` is used)
- 30-minute timeout for export/import operations

**Collections Migrated**:
- listings
- users
- orders
- standing_orders
- messages

**Output**:
- Log file: `migration-YYYYMMDD_HHMMSS.log`
- Export location: GCS bucket with Firestore export

---

### 2. `verify-migration.sh`

**Purpose**: Verifies that Firestore data has been successfully migrated.

**Task**: Phase 4 Cutover - Task 23

**Usage**:
```bash
# Basic verification
./scripts/verify-migration.sh \
  --source-project firebase-project-id \
  --target-project gcp-project-id

# Strict mode (fail on any error)
./scripts/verify-migration.sh \
  --source-project firebase-project-id \
  --target-project gcp-project-id \
  --strict

# Verbose output
./scripts/verify-migration.sh \
  --source-project firebase-project-id \
  --target-project gcp-project-id \
  --verbose
```

**Verification Checks**:
1. **Pre-flight Checks**: gcloud authentication, project accessibility
2. **Collection Existence**: All collections exist in target project
3. **Document Counts**: Compare source vs target (5% tolerance)
4. **Sample Data**: Verify sample documents exist in target
5. **Index Verification**: Check for custom indexes
6. **Data Integrity**: Basic query tests

**Exit Codes**:
- `0`: Verification passed
- `1`: Verification failed

---

### 3. `migrate-auth-users.sh`

**Purpose**: Migrates Firebase Auth users to Cloud Identity Platform.

**Task**: Phase 4 Cutover

**Usage**:
```bash
./scripts/migrate-auth-users.sh \
  --source-project firebase-project-id \
  --target-project gcp-project-id
```

---

## Workflow

### Complete Migration Process

1. **Pre-migration**:
   ```bash
   # Ensure Terraform infrastructure is deployed
   cd infrastructure/terraform
   terraform apply
   ```

2. **Run Migration**:
   ```bash
   # Migrate Firestore data
   ./scripts/migrate-firestore-data.sh \
     --source-project firebase-project-id \
     --target-project gcp-project-id
   ```

3. **Verification** (automatic, or manual):
   ```bash
   ./scripts/verify-migration.sh \
     --source-project firebase-project-id \
     --target-project gcp-project-id
   ```

4. **Post-migration**:
   - Test application against new GCP project
   - Verify real-time sync works
   - Check Cloud Functions
   - Monitor for any issues

5. **Cutover** (Task 24):
   - Disable Firebase project
   - Update DNS/app configuration
   - Monitor production traffic

---

## Prerequisites

- **gcloud CLI**: Installed and authenticated
- **Permissions**:
  - Firestore Admin on both projects
  - Storage Admin for GCS bucket operations
  - Service Account User for import operations
- **Network**: Stable internet connection (export/import can take time)

---

## Troubleshooting

### Common Issues

1. **Permission denied on export/import**:
   - Verify you have Firestore Admin role
   - Check service account permissions: `gsutil iam get gs://[BUCKET]`

2. **Export timeout**:
   - Large datasets may take longer than 30 minutes
   - Check operation status: `gcloud firestore operations list`

3. **Collection not found**:
   - Collection may be empty in source
   - Check case sensitivity of collection names

4. **Verification fails**:
   - Check log file for details
   - Run with `--verbose` flag
   - Verify export completed successfully in GCP Console

---

## Rollback

If migration fails, you can rollback by:

1. Keep the Firebase project running (don't disable)
2. Update app configuration to point back to Firebase
3. Investigate the failure from logs
4. Fix the issue and retry migration

---

## Support

For issues or questions:
- Check log files in `migration-*.log`
- Review GCP Console: https://console.cloud.google.com/firestore
- Consult: `docs/DEPLOYMENT.md` and `docs/ARCHITECTURE.md`
