#!/usr/bin/env python3
"""Offline regression check using the user's actual captured HTML ZIP."""
import json,sys,zipfile
from pathlib import Path
from datetime import date
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from src.history.archive_v392 import parse,signature,validate_pair,fetch_archive_pair

def main(path):
    with zipfile.ZipFile(path) as z:
        groups={};fixtures={}
        for r in json.loads(z.read('report.json')):
            k,d=r['source'],r['date'];ds='-'.join(reversed(d.split('-')));html=z.read(f'{k}-{d}.html');fixtures[k,ds]=(r,html)
            expected=not (k=='minhngoc' and ds<'2008-01-01' or k=='daiphat' and ds=='2005-10-01')
            try:a=parse(k,html,ds,r['url'])
            except ValueError as e:
                if expected:raise
                print('PASS reject',k,ds,e);continue
            assert expected,(k,ds);groups.setdefault(ds,[]).append(a)
            print('PASS read',k,ds,len(a['day']['draws']),'stations')
        assert set(groups)=={'2005-10-01','2007-12-31','2026-11-26'}
        for ds,expected in [('2005-10-01',2),('2007-12-31',3),('2026-11-26',4)]:
            g=groups[ds];assert len(g)==expected and all(signature(x['day'])==signature(g[0]['day']) for x in g);validate_pair(g[0],g[1]);print('PASS agreement',ds,expected,'sources')
        a=next(x for x in groups['2005-10-01'] if 'xoso.net.vn' in x['source']['url']);assert a['source']['normalizations']==[{'station':'Bình Phước','rule':'historical G8/G7 label swap','originalG8':'793','originalG7':'29'}]
        assert next(p for r in a['day']['draws'] if r['station']=='Bình Phước' for p in r['results'] if p['prize']=='giai_db')['value']=='50605'
        class Response:
            def __init__(self,r,h):self.url=r['url'];self.content=h
            def raise_for_status(self):pass
        class Session:
            def get(self,url,timeout):
                from urllib.parse import urlparse
                from src.history.archive_v392 import SOURCES,dates
                k=next(k for k,v in SOURCES.items() if v==urlparse(url).hostname);ds=next(iter(dates(urlparse(url).path)));return Response(*fixtures[k,ds])
        for ds in groups:
            a,b=fetch_archive_pair(date.fromisoformat(ds),Session());assert signature(a['day'])==signature(b['day']);print('PASS pair selection',ds)
        # Alter a digit in a source; exact agreement must fail.
        import copy
        a,b=map(copy.deepcopy,groups['2007-12-31'][:2]);b['day']['draws'][0]['results'][0]['value']='00'
        try:validate_pair(a,b)
        except ValueError:print('PASS disagreement rejected')
        else:raise AssertionError('disagreement accepted')
    print('ALL FIXTURE CHECKS PASSED (12 pages, 3 dates)')
if __name__=='__main__':main(sys.argv[1])
