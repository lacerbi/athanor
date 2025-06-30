#!/bin/bash
# scripts/sign-dev.sh (Robust, Dynamic Version)

# Safety check: Only run on macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "--> This is not a macOS environment. Skipping development app signing."
  exit 0
fi

echo "Applying macOS entitlements to the development Electron app..."
set -e

APP_PATH="./node_modules/electron/dist/Electron.app"
ENTITLEMENTS_PATH="./entitlements.mac.plist"
SIGNING_IDENTITY="-" # Use ad-hoc signing for local dev

# --- The Dynamic Signing Logic ---
# For the Hardened Runtime, all executable code must be signed from the inside out.
# This script finds all nested executable files and .app bundles and signs them individually
# before signing the main application itself.

echo "--> Signing all nested frameworks, helpers, and executables..."

# The 'find' command with '-depth' ensures we sign the deepest items first.
# We are looking for any file that has execute permissions (+111).
find "$APP_PATH/Contents/Frameworks" -depth -type f -perm +111 -exec echo "Signing: {}" \; -exec codesign --sign "$SIGNING_IDENTITY" --force --verbose --options runtime --entitlements "$ENTITLEMENTS_PATH" {} \;

echo "--> Signing the main application..."
codesign --sign "$SIGNING_IDENTITY" --force --verbose --options runtime --entitlements "$ENTITLEMENTS_PATH" "$APP_PATH"

echo ""
echo "✅ Development Electron app and all its nested components successfully signed."