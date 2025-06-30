#!/bin/bash
# scripts/sign-dev.sh (Corrected, Selective Entitlements Version)

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

# ------------------------------------------------------------------
# STEP 1: Sign all nested code WITHOUT entitlements.
# We sign all the executables and libraries that the main app will use.
# These components don't need the special pty entitlement themselves.
# ------------------------------------------------------------------
echo "--> Signing nested frameworks and helpers (without entitlements)..."
find "$APP_PATH/Contents/Frameworks" -depth -type f -perm +111 -exec echo "Signing: {}" \; -exec codesign --sign "$SIGNING_IDENTITY" --force --verbose --options runtime {} \;

# ------------------------------------------------------------------
# STEP 2: Sign the main application WITH entitlements.
# This is where we grant the specific permission for the CLI to work.
# ------------------------------------------------------------------
echo "--> Signing the main application (with entitlements)..."
codesign --sign "$SIGNING_IDENTITY" --force --verbose --options runtime --entitlements "$ENTITLEMENTS_PATH" "$APP_PATH"

echo ""
echo "✅ Development Electron app correctly signed."