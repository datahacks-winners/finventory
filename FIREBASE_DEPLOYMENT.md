# Firebase Deployment Guide

This guide covers deploying and testing Firebase security rules for the Finventory fish marketplace application.

## Prerequisites

- Node.js and npm installed
- Firebase CLI installed globally
- Google account for Firebase console access
- Firebase project created

## Installation

### 1. Install Firebase CLI

If you haven't already installed the Firebase CLI:

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

Authenticate with your Google account:

```bash
firebase login
```

This will open a browser window where you can authenticate with your Google account.

### 3. Install Project Dependencies

Navigate to the mobile app directory and install dependencies:

```bash
cd apps/mobile
npm install
```

This will install all required dependencies including the testing libraries:
- `@firebase/rules-unit-testing` - Firebase rules testing framework
- `mocha` - Test runner
- `chai` - Assertion library
- `ts-node` - TypeScript execution

## Firebase Project Setup

### 1. Initialize Firebase Project

If this is a new Firebase project, initialize it:

```bash
firebase init
```

Follow the prompts:
- Select "Firestore" and "Functions" if needed
- Choose "Use an existing project" or "Create a new project"
- Select "finventory" as your project (or create it)
- Accept default locations for Firestore rules and indexes

### 2. Configure Firebase Projects

You should have separate Firebase projects for:
- **Development**: For testing and development
- **Production**: For live app usage

Update your `.firebaserc` file:

```json
{
  "projects": {
    "default": "finventory-dev",
    "production": "finventory-prod"
  }
}
```

## Security Rules Testing

### 1. Start Firebase Emulators

The emulators allow you to test security rules locally without affecting production data:

```bash
firebase emulators:start --only firestore
```

Or start all emulators:

```bash
firebase emulators:start
```

The emulators will start on:
- Firestore: `http://localhost:8080`
- Authentication: `http://localhost:9099`
- Functions: `http://localhost:5001`

### 2. Run Security Rules Tests

In a separate terminal, run the tests:

```bash
cd apps/mobile
npm test
```

The tests will:
1. Start the Firebase emulators automatically
2. Run all security rule tests
3. Clean up test data
4. Report pass/fail status

### 3. Watch Mode for Development

For continuous testing while developing:

```bash
cd apps/mobile
npm run test:watch
```

## Deploy Security Rules

### Deploy to Development

```bash
firebase deploy --only firestore:rules --project finventory-dev
```

### Deploy to Production

**IMPORTANT**: Always test rules thoroughly before deploying to production!

```bash
firebase deploy --only firestore:rules --project finventory-prod
```

### Deploy with Firestore Indexes

If you have indexes defined:

```bash
firebase deploy --only firestore --project finventory-dev
```

## Deployment Best Practices

### 1. Always Test First

Before deploying any rules changes:
1. Run the full test suite locally
2. Test manually in the Firebase Console
3. Deploy to development environment first

### 2. Use Firebase Console Simulator

Use the Firebase Console's Rules Simulator to test specific operations:
- Go to Firebase Console → Firestore → Rules
- Click "Simulate" button
- Select authentication state and document path
- Test read/write operations

### 3. Monitor Rules in Production

After deploying to production:
- Monitor Firebase logs for unexpected permission denials
- Check for performance issues
- Set up alerts for security violations

## Firebase CLI Commands Reference

### Login & Authentication
```bash
firebase login              # Login to Firebase
firebase logout             # Logout from Firebase
firebase projects:list      # List your projects
```

### Deployment
```bash
firebase deploy             # Deploy all configured features
firebase deploy --only firestore:rules    # Deploy only Firestore rules
firebase deploy --only firestore:indexes  # Deploy only indexes
firebase deploy --project <project-id>    # Deploy to specific project
```

### Emulators
```bash
firebase emulators:start            # Start all emulators
firebase emulators:start --only firestore    # Start only Firestore
firebase emulators:exec --only firestore "npm test"  # Run tests with emulators
```

### Firestore Operations
```bash
firebase firestore:rules           # View current rules
firebase firestore:indexes         # View indexes
```

## Troubleshooting

### Emulator Port Already in Use

If port 8080 is already in use:
```bash
firebase emulators:start --only firestore --port 8081
```

### Test Failures

If tests fail:
1. Ensure emulators are running
2. Check that the rules file path is correct
3. Verify test data setup matches current rules
4. Check for TypeScript compilation errors

### Permission Errors

If you get permission errors during deployment:
```bash
firebase login --reauth
```

### Deployment Fails

If deployment fails:
1. Check your internet connection
2. Verify you have the correct project permissions
3. Ensure rules syntax is valid
4. Check Firebase quotas and limits

## CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Start Firebase Emulators
  run: firebase emulators:start --only firestore &

- name: Run Security Rules Tests
  run: npm test
  working-directory: ./apps/mobile

- name: Stop Emulators
  run: pkill -f firebase-emulators
```

## Security Rules Coverage

The current test suite covers:

- **Users Collection**: Read/create/update own profile
- **User Notifications**: Read/write own notifications
- **Listings Collection**: Public read, seller write operations
- **Listing Views**: Public read, authenticated create
- **Orders Collection**: Buyer/seller access controls
- **Standing Orders**: Buyer-only access
- **Reviews Collection**: Public read, buyer write operations
- **Messages Collection**: Sender/receiver access controls
- **Sushi Certificates**: Public read, seller write operations
- **Transactions**: Read-only for authenticated users
- **Geo Index**: Public read, write-restricted
- **Favorites Collection**: Buyer-only access

## Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security)
- [Testing Security Rules](https://firebase.google.com/docs/rules/unit-tests)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firestore Rules Reference](https://firebase.google.com/docs/reference/firestore/security-rules)

## Support

For issues or questions:
1. Check Firebase documentation
2. Review Firebase Console logs
3. Test with Firebase Console simulator
4. Review this deployment guide