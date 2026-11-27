#!/usr/bin/env python3
"""Descriptive retrospective archive validation. Does not modify official reports."""
import json, sys
from collections import Counter, defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.integrity import atomic_json

COHORTS={'canonical':{'accepted'},'extended_full':{'accepted','cross_checked'},'extended_tail':{'accepted','cross_checked','tail_verified'}}
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def metrics(rows):
    n=len(rows);hits=sum(x['nhay']>0 for x in rows)
    return {'days':n,'hitDays':hits,'hitRate':hits/n if n else None,'totalNhay':sum(x['nhay'] for x in rows),'histogram':dict(sorted(Counter(str(x['nhay']) for x in rows).items(),key=lambda x:int(x[0]))),'uniformIndependentBaseline':sum(1-.98**x['slots'] for x in rows)/n if n else None}
def build_report(root):
    arc=root/'data/history/archive-v394';a=read(arc/'audit.json');h=read(root/'data/history/derived/health.json')
    if a['canonicalRevision']!=h['revision']:raise ValueError('Archive is stale; rerun recovery first')
    groups={k:[] for k in COHORTS};counts=Counter()
    for y in range(int(a['first'][:4]),int(a['last'][:4])+1):
        shard=read(arc/f'years/{y}.json')
        if shard.get('canonicalRevision')!=a['canonicalRevision']:raise ValueError('Archive shard revision mismatch')
        calendar={x['date']:x['universal'] for x in read(root/f'data/web/universal-{y}.json')}
        for ds,d in sorted(shard['dates'].items()):
            if ds[:4]!=str(y) or not a['first']<=ds<=a['last']:raise ValueError('Archive date outside range')
            status=d['status'];counts[status]+=1
            if not any(status in v for v in COHORTS.values()):continue
            u=calendar[ds];p={u['primary'],u['secondary']}
            if len(p)!=2 or any(not isinstance(x,str) or len(x)!=2 or not x.isascii() or not x.isdigit() for x in p):raise ValueError('Invalid calendar pair '+ds)
            draws=d['draws'];names=[x['station'] for x in draws]
            if len(names) not in (3,4) or len(set(names))!=len(names) or any(len(x['tails'])!=18 or any(not isinstance(t,str) or len(t)!=2 or not t.isascii() or not t.isdigit() for t in x['tails']) for x in draws):raise ValueError('Invalid archive tails '+ds)
            row={'date':ds,'nhay':sum(t in p for x in draws for t in x['tails']),'slots':18*len(draws)}
            for key,allowed in COHORTS.items():
                if status in allowed:groups[key].append(row)
    counts['missing']=len(a['missing'])
    if any(counts[k]!=v for k,v in a['counts'].items()):raise ValueError('Archive counts differ from audit')
    report={'schema':1,'canonicalRevision':a['canonicalRevision'],'first':a['first'],'last':a['last'],'cohorts':{},'note':'Retrospective descriptive comparison only. Cohorts overlap; different date coverage is not evidence of predictive advantage. Uniform independent-tail baseline is an assumption, not a profit forecast. Legacy/missing/no draw excluded. Named station corrections are preserved in archive; no claim about historical station 1 order.'}
    for key,rows in groups.items():
        by=defaultdict(list)
        for x in rows:by[x['date'][:4]].append(x)
        report['cohorts'][key]={'statuses':sorted(COHORTS[key]),**metrics(rows),'years':{y:metrics(v) for y,v in sorted(by.items())}}
    atomic_json(arc/'research.json',report)
    return a,report

def main():
    a,r=build_report(ROOT);c=a['counts'];den=sum(c.values())-c.get('no_draw',0);valid=sum(c.get(k,0) for k in ('accepted','cross_checked','tail_verified'))
    print(f"=== XSKT2 V3.9.4 | {a['first']} -> {a['last']} ===")
    for k in ('accepted','cross_checked','tail_verified','legacy','missing','no_draw'):print(f'{k:15s}: {c.get(k,0):5d}')
    print(f'Coverage: {valid}/{den} ({100*valid/den:.2f}%)' if den else 'No draw dates')
    print('Station corrections:',a['stationCorrectionCount']);print('Checked this run:',a['checkedThisRun']);print('Unresolved:',len(a['unresolved']))
    for k,v in Counter(x['reason'] for x in a['unresolved']).most_common():print(v,k)
    print('\n=== BY YEAR ===')
    for y,v in a['years'].items():print(y,v)
    print('\n=== RETROSPECTIVE COHORTS (Top 2, all observed stations) ===')
    for k,v in r['cohorts'].items():print(k, 'days:',v['days'],'hit days:',v['hitDays'],'rate:',f"{v['hitRate']:.2%}" if v['hitRate'] is not None else 'N/A','nhay:',v['totalNhay'])
    print('Saved',ROOT/'data/history/archive-v394/research.json')
if __name__=='__main__':main()
