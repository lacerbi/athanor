#!/bin/bash
# scripts/sign-dev.sh

if [[ "$(uname)" != "Darwin" ]]; then
  echo "--> This is not a macOS environment. Skipping development app signing."
  exit 0
fi

echo "Applying macOS entitlements to the development Electron app..."
set -e
ELECTRON_APP_PATH="./node_modules/electron/dist/Electron.app"
ENTITLEMENTS_PATH="./entitlements.mac.plist"
SIGNING_IDENTITY="-"

codesign --sign "$SIGNING_IDENTITY" --force --options runtime --entitlements "$ENTITLEMENTS_PATH" "$ELECTRON_APP_PATH/Contents/Frameworks/Electron Framework.framework/Versions/A/Helpers/Electron Helper (GPU).app"
# ... (and the other codesign lines) ...
codesign --sign "$SIGNING_IDENTITY" --force --options runtime --entitlements "$ENTITLEMENTS_PATH" "$ELECTRON_APP_PATH"

echo "✅ Development Electron app successfully signed."