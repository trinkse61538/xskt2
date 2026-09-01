#!/usr/bin/env python3
import csv,json,re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CSV=ROOT/'data/history/legacy/xsmn_history.csv';RAW=ROOT/'data/history/raw';RAW.mkdir(parents=True,exist_ok=True)
PRIZES=['giai_8','giai_7','giai_6','giai_5','giai_4','giai_3','giai_2','giai_1','giai_db']

def vals(v): return [x for x in str(v or '').split('|') if x and x.lower()!='nan']
def main():
    if not CSV.exists(): raise SystemExit('Missing legacy CSV; run scripts/import_legacy_history.sh first')
    days=defaultdict(list)
    with CSV.open(encoding='utf-8-sig',newline='') as f:
        for row in csv.DictReader(f):
            dt=datetime.strptime(row['ngay'],'%d-%m-%Y').date().isoformat();results=[]
            for prize in PRIZES:
                for value in vals(row.get(prize,'')):
                    digits=re.sub(r'\D','',value)
                    if digits: results.append({'prize':prize,'value':value,'tail':digits[-2:].zfill(2)})
            if len(results)!=18:
                continue
            days[dt].append({'date':dt,'station':row['tinh'].replace('TP. HCM','TP.HCM'),'results':results,'tails':[x['tail'] for x in results],'result_count':18,'source':{'url':row.get('source_url','legacy-xskt'),'sha256':row.get('source_sha256','')}})
    wrote=0
    for dt,draws in days.items():
        p=RAW/f'{dt}.json'
        if p.exists(): continue
        p.write_text(json.dumps({'date':dt,'draws':draws},ensure_ascii=False,separators=(',',':')),encoding='utf-8');wrote+=1
    print('Migrated',wrote,'days from',len(days),'valid legacy dates')
if __name__=='__main__':main()
