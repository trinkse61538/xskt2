#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then echo 'Node.js required for V3 checks' >&2; exit 2; fi
if command -v node >/dev/null 2>&1; then
  for f in assets/*.js sw.js; do node --check "$f"; done
  node tests/research-v2.test.mjs
  node --test tests/station-v31.test.mjs
  node --test tests/monthly-v32.test.mjs
  node --test tests/guide-v33.test.mjs
  node --test tests/guide-v34.test.mjs
  node --test tests/guide-v35.test.mjs
fi
python -m pytest -q
