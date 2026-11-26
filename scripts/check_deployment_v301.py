#!/usr/bin/env python3
"""Compare production static assets and reports to checked-out main. Read-only."""
import hashlib,json,time,urllib.request,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE='https://xskt2.khaitringuyen.com/'
FILES=('package.json','sw.js','assets/health-v2.js','data/history/derived/health.json','data/backtest/research-v3.json','index.html','assets/app.js','assets/screens.js','assets/station-v31.js','assets/station-v31.css','assets/monthly-v32.js','assets/style.css')
def verify():
    remote={};errors=[]
    for f in FILES:
        try:
            req=urllib.request.Request(BASE+f+'?verify='+str(time.time_ns()),headers={'Cache-Control':'no-cache','User-Agent':'XSKT2-deployment-audit'})
            with urllib.request.urlopen(req,timeout=15) as r:
                if not r.geturl().startswith(BASE):raise ValueError('unexpected redirect')
                data=r.read(20_000_001)
            local=(ROOT/f).read_bytes()
            if hashlib.sha256(local).digest()!=hashlib.sha256(data).digest():errors.append(f+' differs from checkout')
            if f.endswith('.json'):remote[f]=json.loads(data)
        except Exception as e:errors.append(f+': '+str(e))
    h=remote.get(FILES[3],{});b=remote.get(FILES[4],{})
    if not h.get('revision') or h.get('revision')!=b.get('revision'):errors.append('production report revision mismatch')
    if errors:raise SystemExit('\n'.join(errors))
    print('Production matches checkout:',remote[FILES[0]]['version'],h['revision'],h['updatedThrough'])
if __name__=='__main__':verify()
