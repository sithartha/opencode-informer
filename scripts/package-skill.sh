#!/usr/bin/env bash
# Validate and package the OpenCode Informer setup skill for the Agensi marketplace.
#
# Usage:
#   package-skill.sh [--skill-dir skills/opencode-informer-setup]
#
# Output:
#   dist/agensi/opencode-informer-setup.zip
#   dist/agensi/opencode-informer-setup.zip.sha256
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_DIR="$ROOT/skills/opencode-informer-setup"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill-dir) SKILL_DIR="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "error: unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
  echo "error: $SKILL_DIR/SKILL.md is missing" >&2
  exit 1
fi

SKILL_DIR="$(cd "$SKILL_DIR" && pwd)"
SKILL_NAME="$(basename "$SKILL_DIR")"

echo "==> Validating $SKILL_NAME"
python3 - "$SKILL_DIR" <<'PY'
import pathlib, re, sys

try:
    import yaml
except ImportError:
    sys.exit("error: PyYAML is required (python3 -m pip install pyyaml)")

skill_dir = pathlib.Path(sys.argv[1])
text = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
if not match:
    sys.exit("error: SKILL.md has no YAML frontmatter")

data = yaml.safe_load(match.group(1))
if not isinstance(data, dict):
    sys.exit("error: frontmatter is not a mapping")

name = data.get("name")
description = data.get("description")
if name != skill_dir.name:
    sys.exit(f"error: name {name!r} does not match folder {skill_dir.name!r}")
if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", str(name)):
    sys.exit(f"error: name {name!r} is not kebab-case")
if not isinstance(description, str) or len(description.strip()) < 40:
    sys.exit("error: description is missing or too short")

extra = sorted(set(data) - {"name", "description"})
if extra:
    sys.exit(f"error: non-portable frontmatter fields: {', '.join(extra)}")

print(f"    name: {name}")
print(f"    description: {len(description)} chars")
PY

OUT="$ROOT/dist/agensi"
mkdir -p "$OUT"
ZIP="$OUT/$SKILL_NAME.zip"
rm -f "$ZIP" "$ZIP.sha256"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$SKILL_DIR/." "$STAGE/"
find "$STAGE" -name '.DS_Store' -delete

echo "==> Packing (SKILL.md at the archive root)"
(cd "$STAGE" && zip -q -r -X "$ZIP" .)

(cd "$OUT" && shasum -a 256 "$SKILL_NAME.zip") > "$ZIP.sha256"

echo "Skill package: $ZIP"
unzip -l "$ZIP"
echo ""
cat "$ZIP.sha256"
