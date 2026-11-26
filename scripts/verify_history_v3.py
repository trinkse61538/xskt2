#!/usr/bin/env python3
"""Audit all raw, optionally check a bounded historical batch against two sources."""
import argparse,json,sys,time
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.v3 import read_day,legacy_tail_day,fetch_pair,evidence_record,verified_path
from src.history.integrity import atomic_json
from src.history.crawler import http_session

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--limit',type=int,default=0);ap.add_argument('--start',default='2005-10-01');ap.add_argument('--end',default='2025-12-31');a=ap.parse_args()
    raw=ROOT/'data/history/raw';derived=ROOT/'data/history/derived';audit=ROOT/'data/history/verification';audit.mkdir(parents=True,exist_ok=True);candidates=[];tail_only=[];invalid=[];verified=0
    for p in sorted(raw.glob('*.json')):
        try:read_day(p);verified+=verified_path(p).exists()
        except Exception as e:
            invalid.append({'date':p.stem,'reason':str(e)})
            try:legacy_tail_day(json.loads(p.read_text()));tail_only.append(p.stem)
            except Exception:pass
            if a.start<=p.stem<=a.end:candidates.append(p)
    attempted=0;recovered=0
    if a.limit>0:
        session=http_session()
        # Rotate past already attempted records, no repeated hammering of failed sources.
        candidates=[p for p in candidates if not (audit/p.name).exists()]
        for p in candidates[:a.limit]:
            attempted+=1
            try:
                x,y=fetch_pair(date.fromisoformat(p.stem),session);e=evidence_record(p,x,y);atomic_json(verified_path(p),e);read_day(p);recovered+=1;status={'status':'verified'}
            except Exception as e:status={'status':'unresolved','reason':str(e)}
            atomic_json(audit/p.name,status);time.sleep(1)
    if attempted:
        print('Attempted',attempted,'recovered',recovered,'; rerun audit after rebuild')
        return main_audit(raw,derived)
    atomic_json(derived/'recovery-v3.json',{'schema':3,'strictAccepted':len(list(raw.glob('*.json')))-len(invalid),'verifiedSidecars':verified,'rejected':len(invalid),'tailOnlyUnverified':len(tail_only),'tailOnlyDates':tail_only,'note':'Unverified five-digit legacy DB records are NOT included in official metrics.'})
    print('Strict accepted / rejected / tail-only candidates',len(list(raw.glob('*.json')))-len(invalid),len(invalid),len(tail_only))
def main_audit(raw,derived):
    import subprocess
    return subprocess.call([sys.executable,__file__])
if __name__=='__main__':raise SystemExit(main() or 0)
