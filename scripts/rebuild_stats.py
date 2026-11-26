#!/usr/bin/env python3
import json,sys,hashlib
from collections import defaultdict,Counter
from datetime import date,datetime,timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.integrity import validate_day,atomic_json,days
from src.history.research import snapshot
from src.history.v3 import read_day, verified_path
RAW=ROOT/'data/history/raw';OUT=ROOT/'data/history/derived'
def main():
    years=defaultdict(dict); stations=defaultdict(list); invalid=[]; sha=hashlib.sha256(); now=datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'));target=now.date() if (now.hour,now.minute)>=(17,10) else now.date()-timedelta(days=1)
    for p in sorted(RAW.glob('*.json')):
        try:
            obj=read_day(p);d=obj['date']
            if p.stem!=d or date.fromisoformat(d)>target:raise ValueError('date mismatch or future draw')
        except Exception as e:invalid.append({'date':p.stem,'reason':str(e)});continue
        sha.update(p.read_bytes()); sidecar=verified_path(p)
        if sidecar.exists():sha.update(sidecar.read_bytes())
        draws=[]
        for r in obj['draws']:
            v={'station':r['station'],'tails':r['tails']};draws.append(v);stations[r['station']].append({'date':d,'tails':r['tails'],'unique_hits':sorted(set(r['tails']))})
        years[d[:4]][d]={'draws':draws}
    all_dates={d:v for year in years.values() for d,v in year.items()};latest=max(all_dates,default=None); rev=sha.hexdigest()[:16]
    no_draw={p.name[:10] for p in (ROOT/'data/history/failures').glob('*-nodraw.json') if p.name[:10] not in all_dates}
    coverage={}
    for y,v in sorted(years.items()):
        lo=max(date(int(y),1,1),date(2005,10,1));hi=min(date(int(y),12,31),target); expected=[d.isoformat() for d in days(lo,hi)]; missing=[d for d in expected if d not in v and d not in no_draw];coverage[y]={'expected':len(expected),'available':len(v),'noDraw':sum(d in no_draw for d in expected),'missing':missing};atomic_json(OUT/'years'/f'{y}.json',{'revision':rev,'dates':v})
    # Include entirely missing recent years in health summary.
    for y in range(2005,target.year+1):
        if str(y) not in coverage:
            expected=[d.isoformat() for d in days(max(date(y,1,1),date(2005,10,1)),min(target,date(y,12,31)))];coverage[str(y)]={'expected':len(expected),'available':0,'noDraw':sum(d in no_draw for d in expected),'missing':[d for d in expected if d not in no_draw]}
    station_files={}; legacy_st={}
    for name,rows in sorted(stations.items()):
        key=hashlib.sha256(name.encode()).hexdigest()[:16];station_files[name]=key;atomic_json(OUT/'stations'/f'{key}.json',{'revision':rev,'station':name,'draws':rows});legacy_st[name]={'draws':len(rows),'tail_counts':dict(Counter(x for r in rows for x in r['tails'])),'hit_counts':dict(Counter(x for r in rows for x in r['unique_hits'])),'recent':rows[-300:]}
    # Keep compatibility indexes for older clients; new clients use lazy shards.
    atomic_json(OUT/'history-index.json',{'updatedThrough':latest,'dates':all_dates});atomic_json(OUT/'recent-stats.json',{'updatedThrough':latest,'stations':legacy_st})
    global_research=snapshot(stations)
    atomic_json(OUT/'global-anomaly.json',{'updatedThrough':latest,'revision':rev,**global_research})
    global_summary={k:v for k,v in global_research.items() if k!='stations'}
    atomic_json(OUT/'health.json',{'schema':3,'revision':rev,'updatedThrough':latest,'expectedThrough':target.isoformat(),'totalDays':len(all_dates),'years':sorted(years),'coverage':coverage,'stationFiles':station_files,'invalid':invalid,'globalAnomaly':global_summary,'note':'Missing dates are not MISS; NO_DRAW records are legacy source markers, not independent confirmation.'});print('Built',len(all_dates),'days through',latest,'invalid',len(invalid))
    return 0 # rejected records are surfaced in health.json; workflow checks after committing valid progress
if __name__=='__main__':raise SystemExit(main())
