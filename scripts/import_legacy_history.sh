#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="${TMPDIR:-/tmp}/xskt2-legacy"
rm -rf "$TMP"
git clone --depth 1 https://github.com/trinkse61538/xskt.git "$TMP/xskt"
mkdir -p "$ROOT/data/history/legacy"
cp "$TMP/xskt/data/history/xsmn_history.csv" "$ROOT/data/history/legacy/xsmn_history.csv"
[ -f "$TMP/xskt/data/history/known_gaps.csv" ] && cp "$TMP/xskt/data/history/known_gaps.csv" "$ROOT/data/history/legacy/known_gaps.csv" || true
python "$ROOT/scripts/migrate_legacy_csv.py"
echo "Imported and migrated legacy history to canonical daily JSON."
