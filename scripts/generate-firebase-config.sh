#!/bin/bash
# Generate Firebase config for web app from Terraform outputs

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform"
WEB_APP_DIR="${PROJECT_ROOT}/apps/web"
OUTPUT_FILE="${WEB_APP_DIR}/.env.firebase"

echo "🔥 Generating Firebase config from Terraform outputs..."

# Check if Terraform outputs are available
cd "$TERRAFORM_DIR"

if ! terraform output -json > /dev/null 2>&1; then
    echo "❌ Error: Terraform outputs not available. Run 'terraform apply' first."
    exit 1
fi

# Extract values from Terraform outputs
PROJECT_ID=$(terraform output -raw project_id)
API_KEY=$(terraform output -raw firebase_web_api_key)
AUTH_DOMAIN=$(terraform output -raw firebase_auth_domain)
MESSAGING_SENDER_ID=$(terraform output -raw firebase_messaging_sender_id)
STORAGE_BUCKET="${PROJECT_ID}.appspot.com"

# Generate .env file
cat > "$OUTPUT_FILE" << EOF
# Firebase Configuration - Auto-generated from Terraform
# Do not edit manually - Run: ./scripts/generate-firebase-config.sh
VITE_FIREBASE_API_KEY=${API_KEY}
VITE_FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN}
VITE_FIREBASE_PROJECT_ID=${PROJECT_ID}
VITE_FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET}
VITE_FIREBASE_MESSAGING_SENDER_ID=${MESSAGING_SENDER_ID}
VITE_FIREBASE_APP_ID=1:${MESSAGING_SENDER_ID}:web:placeholder
EOF

echo "✅ Firebase config written to: ${OUTPUT_FILE}"
echo ""
echo "Add to your .env file:"
cat "$OUTPUT_FILE"
