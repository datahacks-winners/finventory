# Google OAuth Setup Guide

This guide walks you through configuring Google Sign-In for Finventory.

## Overview

Google OAuth is used for:
- **Web App**: Firebase Auth with Google Sign-In popup
- **Mobile App**: React Native with Google Sign-In SDK → Firebase Auth credential

## Prerequisites

1. Access to Google Cloud Console
2. 1Password CLI configured (`op signin`)
3. Terraform installed (for infrastructure deployment)

## Quick Setup

Run the automated setup script:

```bash
./scripts/setup-google-oauth.sh
```

This will:
1. Fetch credentials from 1Password
2. Update `terraform/terraform.tfvars`
3. Create `.env` files for mobile and web apps

## Manual Setup

### 1. Create OAuth 2.0 Credentials in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project: `finventory-1776558252`
3. Click "Create Credentials" → "OAuth 2.0 Client ID"
4. Configure consent screen if prompted:
   - User Type: External
   - App name: "Finventory"
   - User support email: your email
   - Developer contact email: your email
   - Scopes: `openid`, `email`, `profile`
   - Test users: Add your test email(s)

#### Web Client
1. Application type: "Web application"
2. Name: "Finventory Web"
3. Authorized JavaScript origins:
   - `http://localhost:5173` (dev)
   - `https://finventory.app` (prod)
   - `https://your-project.web.app` (Firebase hosting)
4. Authorized redirect URIs:
   - `https://your-project.firebaseapp.com/__/auth/handler`
5. Click "Create"
6. Copy **Client ID** and **Client Secret**

#### iOS Client (for mobile app)
1. Application type: "iOS"
2. Name: "Finventory iOS"
3. Bundle ID: `com.finventory.app` (or your actual bundle ID)
4. Click "Create"
5. Copy **Client ID**

#### Android Client (for mobile app)
1. Application type: "Android"
2. Name: "Finventory Android"
3. Package name: `com.finventory.app`
4. SHA-1 fingerprint: Get from keystore (see below)
5. Click "Create"
6. Copy **Client ID**

### 2. Get Android SHA-1 Fingerprint

**Debug:**
```bash
cd android && ./gradlew signingReport
```

**Release:**
```bash
keytool -list -v -keystore release.keystore -alias your-alias
```

### 3. Store Credentials in 1Password

Create an item in your Shared vault:
- **Title**: "Google OAuth - Web Client"
- **Field: client_id**: Your web client ID (e.g., `123-abc.apps.googleusercontent.com`)
- **Field: client_secret**: Your web client secret

### 4. Configure Terraform

Update `terraform/terraform.tfvars`:

```hcl
google_oauth_client_id     = "your-web-client-id.apps.googleusercontent.com"
google_oauth_client_secret = "your-web-client-secret"
```

### 5. Deploy Identity Platform

```bash
cd terraform
terraform apply -target=google_identity_platform_config.main
terraform apply -target=google_identity_platform_default_supported_idp_config.google
```

### 6. Configure Mobile App

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

Update `apps/mobile/app.json` with your iOS URL scheme:

```json
{
  "plugins": [
    ["@react-native-google-signin/google-signin", {
      "iosUrlScheme": "com.googleusercontent.apps.YOUR-IOS-CLIENT-ID"
    }]
  ]
}
```

### 7. Configure Web App

Create `apps/web/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## Testing

### Web App

1. Start dev server:
   ```bash
   cd apps/web && npm run dev
   ```
2. Navigate to login page
3. Click "Sign in with Google"
4. Complete OAuth flow
5. Check Firebase Auth console for new user

### Mobile App

1. Start Expo:
   ```bash
   cd apps/mobile && npx expo start
   ```
2. Run on iOS Simulator or Android device
3. Tap Google Sign-In button
4. Complete OAuth flow
5. Verify Firebase Auth state updates

## Troubleshooting

### Error 10: DEVELOPER_ERROR (Android)

- SHA-1 fingerprint mismatch
- Solution: Add correct SHA-1 to Google Cloud Console

### Error: redirect_uri_mismatch

- Authorized redirect URI doesn't match
- Solution: Add exact URI from error to Google Cloud Console

### Error: disallowed_useragent

- Using embedded webview (deprecated)
- Solution: Ensure using proper native Google Sign-In SDK

### Firebase Auth: auth/invalid-credential

- Web client ID mismatch
- Solution: Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` matches Firebase project

## References

- [Firebase Auth with Google](https://firebase.google.com/docs/auth/web/google-signin)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [GCP Identity Platform](https://cloud.google.com/identity-platform/docs)
