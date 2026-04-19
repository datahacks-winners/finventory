#!/bin/bash
# Setup Google OAuth credentials from 1Password

set -e

echo "=== Google OAuth Setup for Finventory ==="
echo ""

# Check if op CLI is installed
if ! command -v op &> /dev/null; then
    echo "Error: 1Password CLI (op) not found"
    echo "Install from: https://developer.1password.com/docs/cli/get-started"
    exit 1
fi

# Check if authenticated with 1Password
if ! op account list &> /dev/null; then
    echo "Error: Not signed in to 1Password CLI"
    echo "Run: op signin"
    exit 1
fi

PROJECT_ID="${1:-finventory-1776558252}"
OP_VAULT="${2:-Shared}"

echo "Fetching Google OAuth credentials from 1Password..."
echo "Project: $PROJECT_ID"
echo "Vault: $OP_VAULT"
echo ""

# Fetch credentials from 1Password
GOOGLE_CLIENT_ID=$(op item get "Google OAuth - Web Client" --vault "$OP_VAULT" --field "client_id" 2>/dev/null || echo "")
GOOGLE_CLIENT_SECRET=$(op item get "Google OAuth - Web Client" --vault "$OP_VAULT" --field "client_secret" 2>/dev/null || echo "")

if [[ -z "$GOOGLE_CLIENT_ID" ]]; then
    echo "WARNING: Google OAuth Client ID not found in 1Password"
    echo "Create it in vault '$OP_VAULT' with item name 'Google OAuth - Web Client'"
    echo "Fields needed: client_id, client_secret"
else
    echo "✓ Found Google OAuth Client ID"
fi

if [[ -z "$GOOGLE_CLIENT_SECRET" ]]; then
    echo "WARNING: Google OAuth Client Secret not found"
else
    echo "✓ Found Google OAuth Client Secret"
fi

# Update terraform.tfvars
TERRAFORM_VARS="$(dirname "$0")/../terraform/terraform.tfvars"
if [[ -f "$TERRAFORM_VARS" && -n "$GOOGLE_CLIENT_ID" && -n "$GOOGLE_CLIENT_SECRET" ]]; then
    echo ""
    echo "Updating terraform.tfvars..."

    # Use sed to replace the placeholder values
    sed -i.bak "s|google_oauth_client_id.*= \"placeholder-client-id\"|google_oauth_client_id     = \"$GOOGLE_CLIENT_ID\"|" "$TERRAFORM_VARS"
    sed -i.bak "s|google_oauth_client_secret.*= \"placeholder-client-secret\"|google_oauth_client_secret = \"$GOOGLE_CLIENT_SECRET\"|" "$TERRAFORM_VARS"
    rm -f "${TERRAFORM_VARS}.bak"

    echo "✓ Updated $TERRAFORM_VARS"
fi

# Update mobile .env if values are available
MOBILE_ENV="$(dirname "$0")/../apps/mobile/.env"
if [[ -n "$GOOGLE_CLIENT_ID" ]]; then
    echo ""
    echo "Setting up mobile app environment..."

    if [[ ! -f "$MOBILE_ENV" ]]; then
        cp "$(dirname "$0")/../apps/mobile/.env.example" "$MOBILE_ENV"
        echo "Created $MOBILE_ENV from example"
    fi

    # Update the Google client ID in .env
    sed -i.bak "s|EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=.*|EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$GOOGLE_CLIENT_ID|" "$MOBILE_ENV"
    rm -f "${MOBILE_ENV}.bak"

    echo "✓ Updated $MOBILE_ENV"
fi

# Update web .env if values are available
WEB_ENV="$(dirname "$0")/../apps/web/.env"
if [[ -n "$GOOGLE_CLIENT_ID" ]]; then
    echo ""
    echo "Setting up web app environment..."

    if [[ ! -f "$WEB_ENV" ]]; then
        cp "$(dirname "$0")/../apps/web/.env.example" "$WEB_ENV"
        echo "Created $WEB_ENV from example"
    fi

    # Update the Google client ID in .env
    sed -i.bak "s|VITE_GOOGLE_CLIENT_ID=.*|VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" "$WEB_ENV"
    rm -f "${WEB_ENV}.bak"

    echo "✓ Updated $WEB_ENV"
fi

echo ""
echo "=== Setup Summary ==="
if [[ -n "$GOOGLE_CLIENT_ID" && -n "$GOOGLE_CLIENT_SECRET" ]]; then
    echo "✓ Google OAuth credentials configured"
    echo ""
    echo "Next steps:"
    echo "1. cd terraform && terraform apply (to deploy Identity Platform config)"
    echo "2. For iOS: Add iOS OAuth client ID to apps/mobile/.env as EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"
    echo "3. For Android: Add SHA-1 fingerprints to the OAuth client in Google Cloud Console"
else
    echo "⚠ Incomplete: Missing credentials"
    echo ""
    echo "To complete setup:"
    echo "1. Create OAuth 2.0 credentials in Google Cloud Console:"
    echo "   https://console.cloud.google.com/apis/credentials"
    echo "2. Store them in 1Password vault '$OP_VAULT':"
    echo "   - Item name: 'Google OAuth - Web Client'"
    echo "   - Fields: client_id, client_secret"
    echo "3. Run this script again"
fi
