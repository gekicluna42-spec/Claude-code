#!/usr/bin/env bash
# Package the theme as an uploadable WordPress zip.
#
#   ./wordpress/build.sh
#
# Produces dist/eynna-cinematic.zip with a single top-level folder, which is
# what Appearance -> Themes -> Add New -> Upload expects.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEME="eynna-cinematic"
OUT="$ROOT/dist/$THEME.zip"

cd "$ROOT/wordpress"

if [ ! -f "$THEME/style.css" ]; then
  echo "error: $THEME/style.css not found" >&2
  exit 1
fi

mkdir -p "$ROOT/dist"
rm -f "$OUT"

zip -r -q -X "$OUT" "$THEME" \
  -x '*.DS_Store' \
  -x '__MACOSX/*' \
  -x '*/node_modules/*' \
  -x '*.map'

echo "built $OUT"
unzip -l "$OUT" | tail -1
