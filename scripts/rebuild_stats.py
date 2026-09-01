#!/usr/bin/env python3
import json,math,sys
from pathlib import Path
from collections import Counter,defaultdict
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.stats import theoretical_baseline
RAW=ROOT/'data/history/raw';OUT=ROOT/'data/history/derived';OUT.mkdir(parents=True,exist_ok=True)
SINGLE_BASELINE=1-.99**18

def zscore(hits,n,p=SINGLE_BASELINE):
    if not n:return 0.0
    den=math.sqrt(n*p*(1-p))
    return (hits-n*p)/den if den else 0.0

def anomaly_payload(recent):
    numbers={}
    for i in range(100):
        num=f'{i:02d}'; vals={}
        for w in (30,100,300):
            sample=recent[-w:]; n=len(sample); hits=sum(num in d['unique_hits'] for d in sample); vals[w]={'n':n,'hits':hits,'rate':hits/n if n else 0.0,'z':zscore(hits,n)}
        z30,z100=vals[30]['z'],vals[100]['z']
        if z100>=2 and z30>=1.5:state='PERSISTENT_UP'
        elif z100<=-2 and z30<=-1.5:state='PERSISTENT_DOWN'
        elif z30>=2:state='WATCH_UP'
        elif z30<=-2:state='WATCH_DOWN'
        else:state='NORMAL'
        numbers[num]={'state':state,'z30':round(z30,2),'z100':round(z100,2),'z300':round(vals[300]['z'],2),'r30':round(vals[30]['rate'],6),'r100':round(vals[100]['rate'],6),'r300':round(vals[300]['rate'],6)}
    return {'baseline_single_18':round(SINGLE_BASELINE,6),'numbers':numbers,'note':'Exploratory statistical anomaly only; anomaly is not physical causation and does not alter core picks.'}

def main():
    stations=defaultdict(lambda:{'draws':0,'tail_counts':Counter(),'hit_counts':Counter(),'recent':[]})
    dates={}; latest=None
    for p in sorted(RAW.glob('*.json')):
        obj=json.loads(p.read_text(encoding='utf-8')); latest=obj['date']; web_draws=[]
        for d in obj['draws']:
            tails=list(d.get('tails') or []);unique=sorted(set(tails));name=d['station'];st=stations[name]
            st['draws']+=1;st['tail_counts'].update(tails);st['hit_counts'].update(unique);st['recent'].append({'date':obj['date'],'tails':tails,'unique_hits':unique})
            web_draws.append({'station':name,'tails':tails})
        dates[obj['date']]={'draws':web_draws}
    station_payload={}
    for name,v in stations.items():
        recent=v['recent'][-300:]
        station_payload[name]={'draws':v['draws'],'tail_counts':dict(v['tail_counts']),'hit_counts':dict(v['hit_counts']),'recent':recent,'anomaly':anomaly_payload(recent)}
    payload={'updatedThrough':latest,'baseline_two_picks_18':theoretical_baseline(2,18),'stations':station_payload,'note':'Empirical history is evaluation/research only; duplicate tails are preserved.'}
    (OUT/'recent-stats.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (OUT/'history-index.json').write_text(json.dumps({'updatedThrough':latest,'dates':dates,'note':'Web evaluation index. Tails preserve duplicates.'},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('Built stats through',latest,'days',len(dates),'stations',len(stations))
if __name__=='__main__':main()
