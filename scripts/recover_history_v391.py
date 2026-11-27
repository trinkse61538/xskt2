#!/usr/bin/env python3
"""Read-only archival cohort: strict accepted, legacy structure, independently compared.
Raw, canonical derived and existing reports are never modified.
"""
import argparse,json,sys,hashlib,time
from pathlib import Path
from datetime import date,timedelta
from collections import Counter,defaultdict
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))

from src.history.archive_v392 import fetch_archive_pair, validate_pair, SOURCES

def build(root, out, start='2005-10-01',end=None,limit=0):
    sys.path.insert(0,str(root))
    from src.history.integrity import atomic_json,station,SCHEDULE
    from src.history.v3 import read_day,legacy_tail_day,fetch_pair,signature,compatible_raw
    raw=root/'data/history/raw'; canonical=root/'data/history/derived/health.json'
    health=json.loads(canonical.read_text()); end=min(end or health['expectedThrough'],health['expectedThrough'])
    start=max(start,'2005-10-01'); prevdir=out/'evidence'; prevdir.mkdir(parents=True,exist_ok=True)
    counts=Counter(); years=defaultdict(dict); missing=[]; rejected=[]; errors=[]; checked=0; session=None
    if limit:
        from src.history.crawler import http_session
        session=http_session()
    d=date(2005,10,1); last=date.fromisoformat(health['expectedThrough']); first=date.fromisoformat(start); stop=date.fromisoformat(end)
    while d<=last:
        ds=d.isoformat(); p=raw/f'{ds}.json'; ev=prevdir/f'{ds}.json'; d+=timedelta(days=1)
        obj=None; status=None; evidence=[]; original=None
        if p.exists():
            try:
                original=json.loads(p.read_text()); obj=read_day(p)
                if obj['date']!=ds:raise ValueError('date mismatch')
                status='accepted'
            except Exception as e:
                try:
                    obj=legacy_tail_day(original)
                    if obj['date']!=ds:raise ValueError('date mismatch')
                    status='legacy'
                except Exception as e2:
                    obj=None; rejected.append({'date':ds,'reason':str(e2)})
        # Cross-check sidecars are separate, and tied to exact original raw hash (if present).
        rawsha=hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
        if status!='accepted' and ev.exists():
            try:
                v=json.loads(ev.read_text()); a,b=v['pair']
                from src.history.v3 import validate_source_day
                aa=validate_source_day(a['day']); bb=validate_source_day(b['day'])
                assert v['rawSha256']==rawsha and aa['date']==bb['date']==ds
                assert len({urlparse(x['source']['url']).hostname for x in (a,b)})==2 and all(urlparse(x['source']['url']).hostname in SOURCES.values() for x in (a,b))
                validate_pair(a,b)
                assert all(__import__('re').fullmatch(r'[0-9a-f]{64}',x['source']['sha256']) for x in (a,b))
                assert signature(aa)==signature(bb)
                assert original is None or compatible_raw(original,aa)
                obj=aa; status='cross_checked';evidence=[a['source'],b['source']]
            except Exception as e:errors.append({'date':ds,'reason':'stored evidence rejected: '+str(e)})
        if status!='accepted' and status!='cross_checked' and session and first<=date.fromisoformat(ds)<=stop and checked<limit:
            checked+=1
            try:
                a,b=fetch_archive_pair(date.fromisoformat(ds),session)
                if a['day']['date']!=ds or b['day']['date']!=ds or signature(a['day'])!=signature(b['day']):raise ValueError('source mismatch')
                if original is not None and not compatible_raw(original,a['day']):raise ValueError('raw/source mismatch; manual review required')
                atomic_json(ev,{'rawSha256':rawsha,'pair':[a,b]});obj=a['day'];status='cross_checked';evidence=[a['source'],b['source']]
                print('Cross-checked',ds,', '.join(urlparse(x['url']).hostname for x in evidence),flush=True)
            except Exception as e:errors.append({'date':ds,'reason':str(e)});print('Not verified',ds,str(e)[:180],flush=True)
            time.sleep(.6)
        if obj is None:
            missing.append(ds);counts['missing']+=1;continue
        draws=[]
        for r in obj['draws']:
            draws.append({'station':station(r['station']),'results':r['results'],'tails':r['tails'],'source':r.get('source',{}),'specialDigits':len(next(x['value'] for x in r['results'] if x['prize']=='giai_db'))})
        names=[r['station'] for r in draws]; expected=SCHEDULE[date.fromisoformat(ds).weekday()]
        if set(names)==set(expected):draws.sort(key=lambda r:expected.index(r['station']))
        years[ds[:4]][ds]={'status':status,'draws':draws,'evidence':evidence};counts[status]+=1
    # Every year has a shard, including years with zero available records.
    for y in range(2005,last.year+1):atomic_json(out/'years'/f'{y}.json',{'schema':1,'dates':years[str(y)]})
    report={'schema':1,'canonicalRevision':health['revision'],'first':'2005-10-01','last':last.isoformat(),'counts':dict(counts),'years':{y:dict(Counter(r['status'] for r in v.values())) for y,v in sorted(years.items())},'missing':missing,'rejected':rejected,'checkedThisRun':checked,'verificationErrors':errors,'parserVersion':'3.9.2','note':'accepted = existing canonical policy, not necessarily independently verified; legacy = structure only; cross_checked = two named domains agree, independence not established; separate archival cohort, not official metrics.'}
    atomic_json(out/'audit.json',report);print(json.dumps({k:report[k] for k in ('first','last','counts','checkedThisRun','parserVersion')},ensure_ascii=False,indent=2));return report

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=ROOT);ap.add_argument('--out',type=Path);ap.add_argument('--start',default='2005-10-01');ap.add_argument('--end');ap.add_argument('--verify-limit',type=int,default=0);a=ap.parse_args();root=a.root.resolve();build(root,a.out or root/'data/history/archive-v391',a.start,a.end,max(0,a.verify_limit))
if __name__=='__main__':main()
