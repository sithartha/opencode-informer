#!/usr/bin/env bash
# Download and install the OpenCode Informer plugin from a GitHub release.
#
# Usage:
#   install-plugin.sh --app-version 0.1.2 --plugin-version 0.1.0 [--force]
#
# Installs to:
#   ${XDG_CONFIG_HOME:-$HOME/.config}/opencode/open-island-mobile-plugin/
#   ${XDG_CONFIG_HOME:-$HOME/.config}/opencode/plugins/open-island-mobile.js
set -euo pipefail

REPO="sithartha/opencode-informer"
APP_VERSION=""
PLUGIN_VERSION=""
FORCE=0

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-version) APP_VERSION="${2:-}"; shift 2 ;;
    --plugin-version) PLUGIN_VERSION="${2:-}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$APP_VERSION" || -z "$PLUGIN_VERSION" ]]; then
  echo "error: --app-version and --plugin-version are required" >&2
  usage >&2
  exit 2
fi

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
PLUGIN_DIR="$CONFIG_DIR/open-island-mobile-plugin"
LOADER="$CONFIG_DIR/plugins/open-island-mobile.js"
ZIP_NAME="open-island-mobile-plugin-${PLUGIN_VERSION}.zip"
BASE_URL="https://github.com/$REPO/releases/download/app-v${APP_VERSION}"

if [[ -e "$LOADER" || -d "$PLUGIN_DIR" ]]; then
  if [[ "$FORCE" -ne 1 ]]; then
    echo "error: a plugin installation already exists:" >&2
    echo "       $PLUGIN_DIR" >&2
    echo "       $LOADER" >&2
    echo "       re-run with --force to replace it" >&2
    exit 1
  fi
  echo "==> Replacing the existing plugin installation"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> Downloading $ZIP_NAME (app-v$APP_VERSION)"
curl -fL --proto '=https' --tlsv1.2 -o "$TMP/$ZIP_NAME" "$BASE_URL/$ZIP_NAME"

echo "==> Verifying checksum"
if curl -fsL --proto '=https' --tlsv1.2 -o "$TMP/SHA256SUMS" "$BASE_URL/SHA256SUMS"; then
  EXPECTED="$(awk -v name="$ZIP_NAME" '$2 == name { print $1 }' "$TMP/SHA256SUMS")"
  if [[ -z "$EXPECTED" ]]; then
    echo "error: $ZIP_NAME is not listed in SHA256SUMS" >&2
    exit 1
  fi
  ACTUAL="$(shasum -a 256 "$TMP/$ZIP_NAME" | awk '{ print $1 }')"
  if [[ "$EXPECTED" != "$ACTUAL" ]]; then
    echo "error: checksum mismatch for $ZIP_NAME" >&2
    echo "       expected $EXPECTED" >&2
    echo "       actual   $ACTUAL" >&2
    exit 1
  fi
  echo "    ok"
else
  echo "warning: SHA256SUMS is not available for this release; continuing without verification" >&2
fi

echo "==> Installing to $PLUGIN_DIR"
rm -rf "$PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR" "$CONFIG_DIR/plugins"
unzip -q "$TMP/$ZIP_NAME" -d "$PLUGIN_DIR"

if [[ ! -f "$PLUGIN_DIR/open-island-mobile.js" ]]; then
  echo "error: the archive does not contain open-island-mobile.js" >&2
  exit 1
fi

cat > "$LOADER" <<EOF
export { default } from "$PLUGIN_DIR/open-island-mobile.js"
EOF

echo "==> Loader written to $LOADER"
echo "    Restart OpenCode to load the plugin."
