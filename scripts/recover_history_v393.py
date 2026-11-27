#!/usr/bin/env python3
import argparse, json, hashlib, sys, time
from collections import Counter,defaultdict
from datetime import date,timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.integrity import atomic_json
from src.history.v3 import read_day
from src.history.archive_v393 import normalize_day,reconcile,fetch_candidates,no_draw_sources,differences

def read(p):return json.loads(p.read_text(encoding='utf-8'))
def build(root,start,end,limit,retry=False):
    raw=root/'data/history/raw'; old=root/'data/history/archive-v391';out=root/'data/history/archive-v393';health=read(root/'data/history/derived/health.json');last=health['expectedThrough'];end=min(end or last,last)
    counts=Counter(); years=defaultdict(dict); missing=[]; unresolved=[]; errors=[]; checked=0;session=None;existing={}
    # Use accepted derived days as the canonical boundary; do not promote raw automatically.
    for y in health['years']:existing.update(read(root/f'data/history/derived/years/{y}.json')['dates'])
    if limit:
        from src.history.crawler import http_session
        session=http_session()
    d=date(2005,10,1)
    while d.isoformat()<=last:
        ds=d.isoformat();d+=timedelta(days=1);p=raw/f'{ds}.json';ev=out/'evidence'/f'{ds}.json';prev=old/'evidence'/f'{ds}.json';obj=None;status='missing';original=None;notes=[];meta={};rawsha=hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None;reason=None
        if p.exists():
            try:original=read(p)
            except Exception as e:reason='raw JSON unreadable: '+str(e)
        if ds in existing:
            obj=read_day(p);status='accepted'
            if obj['date']!=ds:raise ValueError('canonical date mismatch '+ds)
        elif no_draw_sources(ds) and not p.exists() and not ev.exists() and not prev.exists():
            status='no_draw';meta={'sources':no_draw_sources(ds)}
        else:
            if original is not None:
                try:obj,notes=normalize_day(original,ds);status='legacy';meta={'normalizations':notes}
                except Exception as e:reason=str(e)
            # Revalidate persisted evidence; retain v392 evidence untouched.
            tried=False
            for f in (ev,prev):
                if not f.exists():continue
                try:
                    e=read(f)
                    if e.get('rawSha256')!=rawsha:raise ValueError('raw hash changed')
                    if p.exists() and original is None:raise ValueError('raw unreadable')
                    cs=e.get('candidates',e.get('pair',[]));tried=tried or f==ev
                    result=reconcile(ds,original,cs);obj=result.pop('day');status=result.pop('status');meta=result;reason=None;break
                except Exception as ex:reason=str(ex)
            if status not in ('cross_checked','tail_verified') and session and start<=ds<=end and checked<limit and (retry or not tried):
                checked+=1
                try:
                    cs,source_errors=fetch_candidates(date.fromisoformat(ds),session)
                    atomic_json(ev,{'rawSha256':rawsha,'candidates':cs,'sourceErrors':source_errors,'parserVersion':'3.9.3'})
                    if p.exists() and original is None:raise ValueError('raw unreadable')
                    result=reconcile(ds,original,cs);obj=result.pop('day');status=result.pop('status');meta=result;reason=None
                    print(status,ds,flush=True)
                except Exception as e:reason=str(e);errors.append({'date':ds,'reason':reason});print('Review',ds,reason,flush=True)
                time.sleep(.6)
            if status in ('legacy','missing'):
                unresolved.append({'date':ds,'status':status,'reason':reason or ('not yet cross checked' if obj else 'no raw record')})
        if obj:
            draws=[{'station':r['station'],'results':r['results'],'tails':r['tails'],'source':r.get('source',{}),'specialDigits':len(next(x['value'] for x in r['results'] if x['prize']=='giai_db'))} for r in obj['draws']]
            years[ds[:4]][ds]={'status':status,'draws':draws,**meta}
        elif status=='no_draw':years[ds[:4]][ds]={'status':status,'draws':[],**meta}
        else:missing.append(ds)
        counts[status]+=1
    for y in range(2005,date.fromisoformat(last).year+1):atomic_json(out/'years'/f'{y}.json',{'schema':2,'dates':years[str(y)]})
    yc=defaultdict(Counter)
    for y,rs in years.items():yc[y].update(r['status'] for r in rs.values())
    for ds in missing:yc[ds[:4]]['missing']+=1
    report={'schema':2,'parserVersion':'3.9.3','canonicalRevision':health['revision'],'first':'2005-10-01','last':last,'counts':dict(counts),'years':{y:dict(v) for y,v in sorted(yc.items())},'missing':missing,'unresolved':unresolved,'checkedThisRun':checked,'verificationErrors':errors,'note':'Archive only; cross_checked = full source agreement (historical DB may have 5 digits); tail_verified = named prize tails agree, full values not guaranteed; legacy = structure only. NO_DRAW excluded from archive coverage; canonical reports unchanged.'}
    atomic_json(out/'audit.json',report);print(json.dumps({k:report[k] for k in ('first','last','counts','checkedThisRun')},ensure_ascii=False,indent=2));return report

def main():
    p=argparse.ArgumentParser();p.add_argument('--start',default='2005-10-01');p.add_argument('--end');p.add_argument('--verify-limit',type=int,default=0);p.add_argument('--retry',action='store_true');a=p.parse_args();build(ROOT,a.start,a.end,max(0,a.verify_limit),a.retry)
if __name__=='__main__':main()
