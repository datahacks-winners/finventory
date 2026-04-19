#!/bin/bash
set -e

echo "Creating Firebase project..."

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Login if not authenticated
echo "Make sure you're logged in to Firebase:"
firebase login

# Initialize project (interactive)
firebase init firestore functions storage

echo "Firebase project initialized!"
echo "Next steps:"
echo "1. Create the project in Firebase Console"
echo "2. Run: firebase use --add"
echo "3. Run: firebase deploy"