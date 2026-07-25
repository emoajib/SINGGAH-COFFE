#!/bin/bash
# Build Android APK using EAS
# Usage: ./build-android.sh

set -e

echo "Building Android APK..."
npx eas-cli build --platform android --profile preview --non-interactive

echo "Build complete! Check Expo dashboard for download link."