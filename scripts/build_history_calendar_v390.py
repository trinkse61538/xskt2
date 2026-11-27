#!/usr/bin/env python3
"""Create historical compact calendars using the existing frozen Universal engine.
Does not read lottery results or change any existing 2026+ calendar.
"""
import argparse,json,sys,calendar
from pathlib import Path
from datetime import date,timedelta
ROOT=Path(__file__).resolve().parents[1]

def mini(r):
    c=r['calendar'];u=r['universal']
    return {'date':r['date'],'calendar':{'solar_term':c['solar_term'],'year':c['year']['label'],'month':c['month']['label'],'day':c['day']['label'],'officer':c['officer'],'nayin':c['nayin']},'universal':{'day_score':u['day_score'],'agreement':u['agreement'],'tier':u['tier'],'month_rank':u['month_rank'],'primary':u['primary'],'secondary':u['secondary'],'top5':u['top5'],'ranking':[{'number':x['number'],'rank':x['rank'],'score':x['score'],'agreement':x['agreement']} for x in u['ranking'][:20]]}}

def make_year(y,build_day,assign_month_ranks):
    start=date(y,1,1); rows=[build_day(start+timedelta(days=i)) for i in range(366 if calendar.isleap(y) else 365)]
    assign_month_ranks(rows)
    return [mini(r) for r in rows]

def validate(rows,y):
    assert len(rows)==(366 if calendar.isleap(y) else 365),y
    assert [r['date'] for r in rows]==[(date(y,1,1)+timedelta(days=i)).isoformat() for i in range(len(rows))],y
    for r in rows:
        u=r['universal']; assert len(u['ranking'])==20 and len(set(x['number'] for x in u['ranking']))==20
        assert [u['primary'],u['secondary']]==[x['number'] for x in u['ranking'][:2]]
    for m in range(1,13):
        month=[r for r in rows if r['date'][5:7]==f'{m:02}']
        assert [r['universal']['month_rank'] for r in sorted(month,key=lambda r:(-r['universal']['day_score'],-r['universal']['agreement'],r['date']))]==list(range(1,len(month)+1))

def generate(root,out):
    sys.path.insert(0,str(root))
    from src.universal.engine import build_day,assign_month_ranks
    published=json.loads((root/'data/web/universal-2026.json').read_text(encoding='utf-8'))
    reference=make_year(2026,build_day,assign_month_ranks);validate(reference,2026)
    if reference!=published:
        raise RuntimeError('Generated 2026 calendar differs from published 2026. Stop; do not change engine or existing calendars.')
    print('2026: 365/365 complete compact records match published calendar.',flush=True)
    out.mkdir(parents=True,exist_ok=True)
    for y in range(2008,2026):
        rows=make_year(y,build_day,assign_month_ranks);validate(rows,y)
        (out/f'universal-{y}.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        print(f'{y}: {len(rows)} days generated',flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=ROOT);p.add_argument('--out',type=Path,required=True);a=p.parse_args();generate(a.root.resolve(),a.out.resolve())
