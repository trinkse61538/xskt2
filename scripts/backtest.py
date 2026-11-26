#!/usr/bin/env python3
"""Retrospective evaluation, no fitting; compare models on matched dates/scopes."""
import argparse,json,math,re,sys,hashlib
from collections import defaultdict
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.integrity import validate_day,atomic_json
from src.universal.engine import build_day,assign_month_ranks
from src.history.stats import score_picks,theoretical_baseline

def ci95(h,n):
    if not n:return None
    p=h/n;z=1.96;den=1+z*z/n;center=(p+z*z/(2*n))/den;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return [max(0,center-half),min(1,center+half)]
def summarize(rows):
    n=len(rows);h=sum(r['win'] for r in rows);base=sum(r['baseline'] for r in rows)/n if n else None
    return {'n':n,'hits':h,'hitRate':h/n if n else None,'baseline':base,'delta':h/n-base if n else None,'ci95':ci95(h,n),'nhay':sum(r['nhay'] for r in rows)}
def legacy_load(path):
    if not path:return {}
    s=path.read_text(encoding='utf-8-sig');m=re.search(r'window\.V51_DATA\s*=\s*',s)
    if not m:raise ValueError('Cannot locate window.V51_DATA assignment')
    rows,_=json.JSONDecoder().raw_decode(s[m.end():].lstrip());out={}
    for r in rows:
        p=list(dict.fromkeys(str(x).zfill(2) for x in r.get('picks',[])))
        if len(p)>=2 and all(re.fullmatch(r'\d{2}',x) for x in p):out[r['date']]=p
    if not out:raise ValueError('No valid legacy records')
    return out
def split(d):return 'development' if d<'2019-01-01' else 'validation' if d<'2023-01-01' else 'holdout' if d<'2026-01-01' else '2026+ retrospective'
def evaluate(picks,draws):
    score=score_picks(picks,draws);return {'win':score['win'],'nhay':score['total_nhay'],'baseline':theoretical_baseline(len(set(picks)),sum(len(x['tails']) for x in draws))}
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--start',default='2005-10-01');ap.add_argument('--end',default='2050-12-31');ap.add_argument('--legacy-js',type=Path);a=ap.parse_args();legacy=legacy_load(a.legacy_js);raw=[];cache={};skipped=[]
    for p in sorted((ROOT/'data/history/raw').glob('*.json')):
        if not a.start<=p.stem<=a.end:continue
        try:d=validate_day(json.loads(p.read_text(encoding='utf-8')))
        except Exception as e:skipped.append({'date':p.stem,'reason':str(e)});continue
        raw.append(d)
    # Use published calendar unchanged when available; regenerate pre-2026 dates from frozen source only.
    for year in sorted({d['date'][:4] for d in raw}):
        f=ROOT/f'data/web/universal-{year}.json';cache[year]={r['date']:r for r in json.loads(f.read_text(encoding='utf-8'))} if f.exists() else {}
    grouped=defaultdict(list);paired=defaultdict(list);rolling=defaultdict(list);by_month=defaultdict(list)
    for d in raw:
        ds=d['date'];u=(cache[ds[:4]].get(ds) or build_day(date.fromisoformat(ds)))['universal'];rank=[r['number'] for r in u['ranking']];pools={'top1':rank[:1],'top2':rank[:2],'top3':rank[:3],'top5':rank[:5]};scopes={'station1':d['draws'][:1],'any':d['draws']}
        for scope,draws in scopes.items():
            for metric,picks in pools.items():
                v=evaluate(picks,draws);grouped[(split(ds),scope,metric)].append(v);grouped[('all',scope,metric)].append(v)
                if metric=='top2':
                    rolling[scope].append({'date':ds,**v});by_month[(ds[:7],scope)].append(v)
                    if ds in legacy:
                        lv=evaluate(legacy[ds][:2],draws);paired[scope].append((v,lv))
    results=[{'period':k[0],'scope':k[1],'metric':k[2],**summarize(v)} for k,v in sorted(grouped.items())];comparisons=[]
    for scope,v in paired.items():
        u=[x[0] for x in v];l=[x[1] for x in v];comparisons.append({'scope':scope,'universal':summarize(u),'legacy':summarize(l),'universalOnly':sum(a['win'] and not b['win'] for a,b in v),'legacyOnly':sum(b['win'] and not a['win'] for a,b in v)})
    rolling_summary={scope:[{'date':v[i]['date'],**summarize(v[max(0,i-89):i+1])} for i in range(len(v)) if i>=89 and (i%30==0 or i==len(v)-1)] for scope,v in rolling.items()}
    manifest={'schema':2,'engine':'universal-v1.0','first':raw[0]['date'] if raw else None,'last':raw[-1]['date'] if raw else None,'totalDays':len(raw),'skipped':skipped,'metrics':results,'matchedLegacy':comparisons,'rolling90DrawDays':rolling_summary,'monthly':[{'month':k[0],'scope':k[1],**summarize(v)} for k,v in sorted(by_month.items())],'limitations':['All results are retrospective unless independently timestamped before draw. Holdout label refers to date split, not proof of untouched data.','Wilson intervals describe day-level hit counts under independence; temporal dependence and multiple comparisons are not adjusted.','Uniform independent-tail null is theoretical, not a payout or profit model.','Legacy comparison is limited to overlapping published calendar dates. Personal is evaluated locally in the browser; no birth data exported.']}
    atomic_json(ROOT/'data/backtest/backtest-summary.json',manifest);print('Backtest',len(raw),'days; skipped',len(skipped),'matched scopes',len(comparisons))
if __name__=='__main__':main()
