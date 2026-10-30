#!/bin/zsh
# Build an unsigned IPA for direct distribution (Sideloadly / AltStore) and package the
# OpenCode plugin zip, then write checksums. No signing identity is required.
#
# Usage:
#   ./scripts/release-ipa.sh
#
# Output:
#   dist/ipa/OpenCodeInformer-<version>-unsigned.ipa
#   dist/ipa/open-island-mobile-plugin-<plugin-version>.zip   (when the plugin packaging script exists)
#   dist/ipa/SHA256SUMS
set -euo pipefail
setopt null_glob

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_JSON="app/app.json"
PKG_JSON="app/package.json"
PLUGIN_JSON="plugin/package.json"

json() {
  node -e "const v=require('./$1'); console.log(process.argv[1].split('.').reduce((o,k)=>o?.[k], v))" "$2"
}

VERSION="$(json "$APP_JSON" expo.version)"
BUILD="$(json "$APP_JSON" expo.ios.buildNumber)"
PKG_VERSION="$(json "$PKG_JSON" version)"
PLUGIN_VERSION="$(json "$PLUGIN_JSON" version)"

if [[ "$VERSION" != "$PKG_VERSION" ]]; then
  echo "error: app/app.json version ($VERSION) != app/package.json version ($PKG_VERSION)" >&2
  exit 1
fi
if [[ -z "$BUILD" || "$BUILD" == "undefined" ]]; then
  echo "error: app/app.json expo.ios.buildNumber is missing" >&2
  exit 1
fi

echo "==> App $VERSION (build $BUILD), plugin $PLUGIN_VERSION"

if [[ "${SKIP_PREBUILD:-0}" == "1" ]]; then
  echo "==> SKIP_PREBUILD=1: using the existing app/ios"
else
  echo "==> Prebuilding app/ios so Info.plist matches app.json"
  (cd app && npx expo prebuild -p ios)
fi

ARCHIVE="$ROOT/app/build/OpenCodeInformer.xcarchive"
OUT="$ROOT/dist/ipa"
rm -rf "$ARCHIVE"
mkdir -p "$OUT"
rm -f "$OUT"/*.ipa "$OUT"/*.zip "$OUT/SHA256SUMS"

echo "==> Archiving (unsigned)"
set +e
(cd app/ios && xcodebuild \
  -workspace OpenCodeInformer.xcworkspace \
  -scheme OpenCodeInformer \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  archive) > "$ROOT/dist/ipa/xcodebuild-archive.log" 2>&1
STATUS=$?
set -e
if [[ $STATUS -ne 0 ]]; then
  echo "error: xcodebuild archive failed; see dist/ipa/xcodebuild-archive.log" >&2
  echo "       fallback: build with 'xcodebuild build -sdk iphoneos' and assemble Payload/ by hand" >&2
  exit $STATUS
fi

APP_PATH="$ARCHIVE/Products/Applications/OpenCodeInformer.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "error: archived app not found at $APP_PATH" >&2
  exit 1
fi
if [[ ! -d "$APP_PATH/PlugIns/LiveActivity.appex" ]]; then
  echo "error: LiveActivity.appex is missing from the archived app" >&2
  exit 1
fi

ARCHIVED_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Info.plist")"
ARCHIVED_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP_PATH/Info.plist")"
if [[ "$ARCHIVED_VERSION" != "$VERSION" || "$ARCHIVED_BUILD" != "$BUILD" ]]; then
  echo "error: archived Info.plist is $ARCHIVED_VERSION ($ARCHIVED_BUILD), expected $VERSION ($BUILD)" >&2
  exit 1
fi
if codesign -dv "$APP_PATH" >/dev/null 2>&1; then
  echo "error: archived app is signed; expected an unsigned build" >&2
  exit 1
fi

IPA="$OUT/OpenCodeInformer-$VERSION-unsigned.ipa"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/Payload"
cp -R "$APP_PATH" "$STAGE/Payload/"
(cd "$STAGE" && ditto -c -k --sequesterRsrc --keepParent Payload "$IPA")

CHECK_FILES=("OpenCodeInformer-$VERSION-unsigned.ipa")
if [[ -x scripts/package-plugin.sh ]]; then
  echo "==> Packaging plugin"
  ./scripts/package-plugin.sh
  cp "dist/plugin/open-island-mobile-plugin-$PLUGIN_VERSION.zip" "$OUT/"
  CHECK_FILES+=("open-island-mobile-plugin-$PLUGIN_VERSION.zip")
fi

echo "==> Checksums"
(cd "$OUT" && shasum -a 256 "${CHECK_FILES[@]}") > "$OUT/SHA256SUMS"

echo "==> Release notes"
ROW="$(grep -m1 "^| $VERSION " docs/compatibility.md || true)"
if [[ -z "$ROW" ]]; then
  echo "warning: no compatibility row for $VERSION in docs/compatibility.md" >&2
  ROW="| $VERSION | $BUILD | _add row_ | _add row_ | _add row_ | _add row_ | no | _add row_ |"
fi
{
  echo "## OpenCode Informer $VERSION (build $BUILD)"
  echo ""
  echo "Direct install without the App Store. Unsigned IPA — re-sign with Sideloadly or"
  echo "AltStore using your own Apple ID."
  echo ""
  echo "### Compatibility"
  echo ""
  echo "| App / IPA | Build | Min iOS | Plugin | macOS helper | Cross-platform helper | Verified | Notes |"
  echo "|---|---|---|---|---|---|---|---|"
  echo "$ROW"
  echo ""
  echo "### Install"
  echo ""
  echo "1. Install the plugin \`open-island-mobile-plugin-$PLUGIN_VERSION.zip\` from this release."
  echo "2. Install the helper version from the table above."
  echo "3. Sideload \`OpenCodeInformer-$VERSION-unsigned.ipa\`."
  echo "4. Pair, then verify live activity and one approval."
  echo ""
  echo "Full steps: https://github.com/sithartha/opencode-informer/blob/main/docs/install.md"
  echo ""
  echo "### Support"
  echo ""
  echo "If the app is useful to you, you can [leave a tip](https://app.lava.top/products/9229b73c-5352-4452-a5b9-79ec43811176)."
  echo ""
  echo "### Checksums"
  echo ""
  echo '```'
  cat "$OUT/SHA256SUMS"
  echo '```'
} > "$OUT/RELEASE_NOTES.md"

echo ""
echo "IPA:       $IPA"
echo "Checksums: $OUT/SHA256SUMS"
cat "$OUT/SHA256SUMS"
