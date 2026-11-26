#!/usr/bin/env python3
"""Linear-time current-calendar scoring; independent of training and history diagnostics."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.stats import score_picks
from src.history.integrity import validate_day,atomic_json

def main():
    cache={};out=[]
    for p in sorted((ROOT/'data/history/raw').glob('*.json')):
        try:d=validate_day(json.loads(p.read_text(encoding='utf-8')))
        except Exception:continue
        y=d['date'][:4]
        if y not in cache:
            f=ROOT/f'data/web/universal-{y}.json';cache[y]={r['date']:r for r in json.loads(f.read_text(encoding='utf-8'))} if f.exists() else {}
        r=cache[y].get(d['date']);
        if not r:continue
        u=r['universal'];picks=[u['primary'],u['secondary']];draws=d['draws'];out.append({'date':d['date'],'universal':{'picks':picks,'station_1':score_picks(picks,draws[:1]),'any_station':score_picks(picks,draws)},'trials':{'station_1':18,'any_station':18*len(draws)}})
    atomic_json(ROOT/'data/history/derived/scored-results.json',out);print('Scored',len(out))
if __name__=='__main__':main()
