#!/bin/zsh
# Build the helper and assemble a menu-bar .app bundle.
set -euo pipefail

cd "$(dirname "$0")/.."

swift build -c release

APP="$PWD/dist/OpenIsland BLE.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp "$PWD/.build/release/OpenIslandBLE" "$APP/Contents/MacOS/OpenIslandBLE"
cp "$PWD/Resources/Info.plist" "$APP/Contents/Info.plist"

echo "Built $APP"
echo "Run it with: open \"$APP\""
