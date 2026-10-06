#!/bin/zsh
# Build the helper and assemble a menu-bar .app bundle.
set -euo pipefail

cd "$(dirname "$0")/.."

swift build -c release

APP="$PWD/dist/OpenCode Informer.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp "$PWD/.build/release/OpenCodeInformerHelper" "$APP/Contents/MacOS/OpenCodeInformerHelper"
cp "$PWD/Resources/Info.plist" "$APP/Contents/Info.plist"
cp "$PWD/Resources/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"

echo "Built $APP"
echo "Run it with: open \"$APP\""
