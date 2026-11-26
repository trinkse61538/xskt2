#!/usr/bin/env python3
"""Import only missing dates from a local legacy CSV; log conflicts, never overwrite."""
import argparse,csv,json,sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.integrity import EXPECTED,station,validate_day,atomic_json

def main():
    a=argparse.ArgumentParser();a.add_argument('csv',type=Path);a=a.parse_args();group=defaultdict(list)
    with a.csv.open(encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f):
            d=datetime.strptime(r['ngay'],'%d-%m-%Y').date().isoformat();res=[]
            for k in EXPECTED:
                for v in (r.get(k) or '').split('|'):res.append({'prize':k,'value':v,'tail':v[-2:]})
            group[d].append({'date':d,'station':station(r['tinh']),'results':res,'tails':[x['tail'] for x in res],'result_count':len(res),'source':{'url':r.get('source_url','legacy-xskt'),'sha256':r.get('source_sha256','')}})
    raw=ROOT/'data/history/raw';issues=[];n=0
    for d,draws in sorted(group.items()):
        p=raw/f'{d}.json'
        try:
            obj=validate_day({'date':d,'draws':draws})
            if p.exists():
                old=validate_day(json.loads(p.read_text(encoding='utf-8')))
                def sig(o):return {r['station']:[(x['prize'],x['value']) for x in r['results']] for r in o['draws']}
                if sig(old)!=sig(obj):issues.append({'date':d,'reason':'source conflict; existing retained'})
                continue
            atomic_json(p,obj);n+=1
        except Exception as e:issues.append({'date':d,'reason':str(e)})
    atomic_json(ROOT/'data/history/derived/import-audit.json',{'imported':n,'issues':issues});print('Imported',n,'issues',len(issues),'see import-audit.json')
if __name__=='__main__':main()
