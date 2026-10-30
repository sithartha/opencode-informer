#!/usr/bin/env bash
# Report the local OpenCode Informer setup: plugin files, helper process, bridge state.
#
# Usage: check-setup.sh [bridge-url]
set -euo pipefail

BRIDGE_URL="${1:-http://127.0.0.1:38963}"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
PLUGIN_DIR="$CONFIG_DIR/open-island-mobile-plugin"
LOADER="$CONFIG_DIR/plugins/open-island-mobile.js"

status_line() {
  printf '%-22s %s\n' "$1" "$2"
}

echo "OpenCode Informer setup"
echo "-----------------------"

if [[ -f "$LOADER" ]]; then
  status_line "Plugin loader" "present ($LOADER)"
else
  status_line "Plugin loader" "missing ($LOADER)"
fi

if [[ -f "$PLUGIN_DIR/package.json" ]]; then
  VERSION="$(node -p "require('$PLUGIN_DIR/package.json').version" 2>/dev/null || echo unknown)"
  status_line "Plugin version" "$VERSION"
else
  status_line "Plugin version" "not installed"
fi

CODE="$(curl -s -o /dev/null -m 3 -w '%{http_code}' "$BRIDGE_URL/status" || true)"
case "$CODE" in
  200) status_line "Bridge" "reachable, token accepted ($BRIDGE_URL)" ;;
  401) status_line "Bridge" "reachable, token required ($BRIDGE_URL)" ;;
  000|"") status_line "Bridge" "not reachable ($BRIDGE_URL)" ;;
  *) status_line "Bridge" "unexpected HTTP $CODE ($BRIDGE_URL)" ;;
esac

if pgrep -f "OpenCodeInformerHelper|opencode-informer-helper" >/dev/null 2>&1; then
  status_line "Helper" "running"
else
  status_line "Helper" "not running"
fi

if [[ -d "/Applications/OpenCode Informer.app" ]]; then
  HELPER_VERSION="$(defaults read "/Applications/OpenCode Informer.app/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo unknown)"
  status_line "Helper version" "$HELPER_VERSION (macOS app)"
fi

if nc -z 127.0.0.1 38964 >/dev/null 2>&1; then
  status_line "Helper port" "38964 open"
else
  status_line "Helper port" "38964 closed"
fi

echo ""
echo "Expected versions: docs/compatibility.md"
echo "Troubleshooting:   references/troubleshooting.md"
