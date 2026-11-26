#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if command -v node >/dev/null 2>&1; then
  for f in assets/*.js sw.js; do node --check "$f"; done
  node tests/research-v2.test.mjs
fi
python -m pytest -q
