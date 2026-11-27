#!/usr/bin/env python3
import json
from pathlib import Path
from collections import Counter
p=Path(__file__).resolve().parents[1]/'data/history/archive-v393/audit.json'
d=json.loads(p.read_text(encoding='utf-8'));c=d['counts'];n=sum(c.values());den=n-c.get('no_draw',0);valid=sum(c.get(k,0) for k in ('accepted','cross_checked','tail_verified'))
print(f"=== XSKT2 V3.9.3 | {d['first']} → {d['last']} ===")
for k in ('accepted','cross_checked','tail_verified','legacy','missing','no_draw'): print(f'{k:15s}: {c.get(k,0):5d}')
print(f'Coverage (canonical + cross-check + tails): {valid}/{den} ({100*valid/den:.2f}%)' if den else 'No draw dates')
print('Checked this run:',d['checkedThisRun']);print('Unresolved:',len(d['unresolved']))
for k,v in Counter(r['reason'] for r in d['unresolved']).most_common():print(f'{v:5d} {k[:200]}')
print('\n=== BY YEAR ===')
for y,r in d['years'].items():print(y,r)
