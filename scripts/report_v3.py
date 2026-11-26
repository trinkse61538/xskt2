#!/usr/bin/env python3
"""Versioned retrospective comparison; forward ledger audit, not proof of prediction."""
import json,sys,hashlib,math
from pathlib import Path
from datetime import datetime,date
from collections import defaultdict
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.v3 import read_day,sha
from src.history.integrity import atomic_json
from src.history.stats import score_picks,theoretical_baseline

def paired_p(a,b):
    n=a+b
    if not n:return 1.0
    # Exact two-sided sign/McNemar; integer math avoids underflow for typical n.
    return min(1.,2*sum(math.comb(n,i) for i in range(min(a,b)+1))/2**n)

def main():
    derived=ROOT/'data/history/derived';h=json.loads((derived/'health.json').read_text());b=json.loads((ROOT/'data/backtest/backtest-summary.json').read_text());metrics=[]
    if b.get('revision')!=h['revision']:raise ValueError('backtest revision mismatch; rebuild first')
    for m in b.get('matchedLegacy',[]):metrics.append({**m,'pairedP':paired_p(m['universalOnly'],m['legacyOnly'])})
    forward=[];cache={};rejected=[]
    for p in sorted((ROOT/'data/ledger').glob('*.json')):
        try:
            d=json.loads(p.read_text());ds=d['date'];t=datetime.fromisoformat(d['capturedAt']);
            if t.tzinfo is None:raise ValueError('timestamp missing timezone')
            from zoneinfo import ZoneInfo;t=t.astimezone(ZoneInfo('Asia/Ho_Chi_Minh'))
            if t.date().isoformat()!=ds or t.hour>=16 or p.stem!=ds:raise ValueError('not before cutoff')
            if ds>h['expectedThrough']:continue
            y=ds[:4];cal=ROOT/f'data/web/universal-{y}.json'
            if y not in cache:cache[y]=(sha(cal),{r['date']:r['universal'] for r in json.loads(cal.read_text())})
            digest,records=cache[y];u=records[ds]
            if digest!=d['sourceFileSha256'] or [u['primary'],u['secondary']]!=[d['primary'],d['secondary']]:raise ValueError('calendar/ledger mismatch')
            raw=ROOT/f'data/history/raw/{ds}.json'
            if not raw.exists():continue
            obj=read_day(raw);picks=[d['primary'],d['secondary']];row={'date':ds}
            for k,draws in [('station1',obj['draws'][:1]),('any',obj['draws'])]:row[k]={'hit':score_picks(picks,draws)['win'],'baseline':theoretical_baseline(2,sum(len(x['tails']) for x in draws))}
            forward.append(row)
        except Exception as e:rejected.append({'date':p.stem,'reason':str(e)})
    summary={k:{'n':len(forward),'hits':sum(r[k]['hit'] for r in forward),'baseline':sum(r[k]['baseline'] for r in forward)/len(forward) if forward else None} for k in ('station1','any')}
    atomic_json(ROOT/'data/backtest/research-v3.json',{'schema':3,'revision':h['revision'],'first':b['first'],'last':b['last'],'totalDays':b['totalDays'],'metrics':b['metrics'],'matchedLegacy':metrics,'monthly':b.get('monthly',[]),'rolling':b.get('rolling90DrawDays',{}),'forward':{'summary':summary,'rejected':rejected,'note':'Ledger runner timestamp and calendar hash checked; not independently timestamped.'},'limitations':b['limitations']+['Paired p is unadjusted; multiple comparisons and temporal dependence remain. No prediction advantage implied.']})
if __name__=='__main__':main()
