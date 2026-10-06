#!/bin/zsh
# Build, sign (Developer ID + hardened runtime), notarize, staple, and package the
# macOS helper into a distributable .dmg with an Applications shortcut for drag-install.
#
# Prerequisites:
#   - A "Developer ID Application" certificate in the login keychain
#     (Xcode → Settings → Accounts → Manage Certificates → + → Developer ID Application).
#   - An app-specific password (or notarytool profile) for notarization.
#
# Usage:
#   DEVELOPER_ID_APP="Developer ID Application: Your Name (TEAMID)" ./scripts/release-helper.sh
set -euo pipefail

cd "$(dirname "$0")/.."

IDENTITY="${DEVELOPER_ID_APP:-Developer ID Application: Anton Budnik (6R3Q9WJ93G)}"
TEAM_ID="${TEAM_ID:-6R3Q9WJ93G}"
APPLE_ID="${APPLE_ID:-psitharta@gmail.com}"
PASSWORD_FILE="${PASSWORD_FILE:-$HOME/.config/opencode/asc-app-password}"
VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' Resources/Info.plist)"
BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' Resources/Info.plist)"

echo "==> Building release"
swift build -c release

APP="$PWD/dist/OpenCode Informer.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$PWD/.build/release/OpenCodeInformerHelper" "$APP/Contents/MacOS/OpenCodeInformerHelper"
cp "$PWD/Resources/Info.plist" "$APP/Contents/Info.plist"
cp "$PWD/Resources/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"

echo "==> Signing with: $IDENTITY"
codesign --force --options runtime --timestamp --sign "$IDENTITY" "$APP/Contents/MacOS/OpenCodeInformerHelper"
codesign --force --options runtime --timestamp --sign "$IDENTITY" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

echo "==> Building dmg (with Applications shortcut)"
DMG="$PWD/dist/OpenCodeInformerHelper-$VERSION.dmg"
rm -f "$DMG"
STAGE="$(mktemp -d)"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "OpenCode Informer" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
codesign --force --timestamp --sign "$IDENTITY" "$DMG"

echo "==> Notarizing (this can take a few minutes)"
xcrun notarytool submit "$DMG" \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$(cat "$PASSWORD_FILE")" \
  --wait

echo "==> Stapling"
xcrun stapler staple "$DMG"

echo "==> Verifying"
spctl -a -vvv -t install "$DMG" || true
xcrun stapler validate "$DMG"

echo ""
echo "Release artifact: $DMG"
echo "Bundle id: $BUNDLE_ID ($VERSION)"
