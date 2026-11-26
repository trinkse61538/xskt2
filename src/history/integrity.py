"""Canonical validation, atomic JSON and coverage helpers."""
import json, os, re, tempfile
from datetime import date, timedelta
from pathlib import Path
EXPECTED={'giai_8':(1,2),'giai_7':(1,3),'giai_6':(3,4),'giai_5':(1,4),'giai_4':(7,5),'giai_3':(2,5),'giai_2':(1,5),'giai_1':(1,5),'giai_db':(1,6)}
SCHEDULE=[['TP.HCM','Đồng Tháp','Cà Mau'],['Bến Tre','Vũng Tàu','Bạc Liêu'],['Đồng Nai','Cần Thơ','Sóc Trăng'],['Tây Ninh','An Giang','Bình Thuận'],['Vĩnh Long','Bình Dương','Trà Vinh'],['TP.HCM','Long An','Bình Phước','Hậu Giang'],['Tiền Giang','Kiên Giang','Đà Lạt']]
def station(s):
    return {'TP. HCM':'TP.HCM','TP HCM':'TP.HCM','TP. Hồ Chí Minh':'TP.HCM'}.get(s.strip(),s.strip())
def days(start,end):
    while start<=end:
        yield start;start+=timedelta(days=1)
def atomic_json(path,obj):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.tmp-')
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as f:json.dump(obj,f,ensure_ascii=False,separators=(',',':'))
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
def validate_day(obj, strict=None):
    d=date.fromisoformat(obj['date']); strict=d.year>=2026 if strict is None else strict
    rows=obj['draws']; names=[station(r['station']) for r in rows]
    if len(names)!=len(set(names)) or not names:raise ValueError('duplicate/empty stations')
    if strict and set(names)!=set(SCHEDULE[d.weekday()]):raise ValueError(f'unexpected stations {names}')
    for r in rows:
        if r.get('date')!=obj['date'] or r.get('result_count')!=18 or len(r['results'])!=18:raise ValueError('invalid draw count/date')
        found={k:0 for k in EXPECTED}; tails=[]
        for p in r['results']:
            k=p['prize'];v=p['value'];n,length=EXPECTED[k]
            if not isinstance(v,str) or not re.fullmatch(r'[0-9]{'+str(length)+'}',v) or p['tail']!=v[-2:]:raise ValueError('invalid prize length/tail')
            found[k]+=1;tails.append(v[-2:])
        if any(found[k]!=v[0] for k,v in EXPECTED.items()) or tails!=r['tails']:raise ValueError('prize count/tails mismatch')
    # Do not mutate raw records. Canonical order for current schedule; retain historical source order otherwise.
    if set(names)==set(SCHEDULE[d.weekday()]):rows=sorted(rows,key=lambda r:SCHEDULE[d.weekday()].index(station(r['station'])))
    return {'date':obj['date'],'draws':[{**r,'station':station(r['station'])} for r in rows]}
