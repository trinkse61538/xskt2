#!/usr/bin/env python3
"""Record today only, prior to draw; no backdating. Personal profiles stay client-side."""
import hashlib,json,sys
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.integrity import atomic_json
now=datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'));d=now.date().isoformat()
if now.hour>=16:raise SystemExit('Refusing to freeze after 16:00 VN; no retroactive record.')
p=ROOT/f'data/ledger/{d}.json'
if p.exists():raise SystemExit(0)
f=ROOT/f'data/web/universal-{now.year}.json';r=next(r for r in json.loads(f.read_text(encoding='utf-8')) if r['date']==d);u=r['universal'];atomic_json(p,{'date':d,'capturedAt':now.isoformat(),'engine':'universal-v1.0','sourceFileSha256':hashlib.sha256(f.read_bytes()).hexdigest(),'primary':u['primary'],'secondary':u['secondary'],'top5':u['top5'],'note':'Capture time is runner time; verify commit timestamp independently.'})
