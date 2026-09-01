#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'data/universal';OUT=ROOT/'data/web';OUT.mkdir(parents=True,exist_ok=True)
for p in sorted(SRC.glob('universal-*.json')):
    rows=json.loads(p.read_text(encoding='utf-8')); mini=[]
    for r in rows:
        u=r['universal']
        mini.append({'date':r['date'],'calendar':{'solar_term':r['calendar']['solar_term'],'year':r['calendar']['year']['label'],'month':r['calendar']['month']['label'],'day':r['calendar']['day']['label'],'officer':r['calendar']['officer'],'nayin':r['calendar']['nayin']},'universal':{'day_score':u['day_score'],'agreement':u['agreement'],'tier':u['tier'],'month_rank':u['month_rank'],'primary':u['primary'],'secondary':u['secondary'],'top5':u['top5'],'ranking':[{'number':x['number'],'rank':x['rank'],'score':x['score'],'agreement':x['agreement']} for x in u['ranking'][:20]]}})
    q=OUT/p.name;q.write_text(json.dumps(mini,ensure_ascii=False,separators=(',',':')),encoding='utf-8');print('wrote',q)
