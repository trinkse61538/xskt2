#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
for f in assets/*.js; do
  if command -v node >/dev/null 2>&1; then node --check "$f"; fi
done
python -m pytest -q
echo "XSKT2 Web checks passed."
