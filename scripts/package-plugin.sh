#!/bin/zsh
# Package the OpenCode plugin as a release asset: the entry, its module graph, and the
# package metadata. Tests and node_modules are excluded.
#
# Usage:
#   ./scripts/package-plugin.sh
#
# Output:
#   dist/plugin/open-island-mobile-plugin-<version>.zip
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./plugin/package.json').version")"
OUT="$ROOT/dist/plugin"
ZIP="$OUT/open-island-mobile-plugin-$VERSION.zip"

for file in open-island-mobile.js package.json README.md; do
  if [[ ! -f "plugin/$file" ]]; then
    echo "error: plugin/$file is missing" >&2
    exit 1
  fi
done
if [[ ! -d plugin/src ]]; then
  echo "error: plugin/src is missing" >&2
  exit 1
fi

mkdir -p "$OUT"
rm -f "$ZIP"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp plugin/open-island-mobile.js plugin/package.json plugin/README.md "$STAGE/"
cp -R plugin/src "$STAGE/src"
find "$STAGE" -name '.DS_Store' -delete

(cd "$STAGE" && zip -q -r -X "$ZIP" .)

echo "Plugin package: $ZIP"
unzip -l "$ZIP"
