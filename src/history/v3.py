"""V3 integrity: immutable raw, independently compared corrections, named station parsing."""
import hashlib,json,re,unicodedata
from pathlib import Path
from datetime import date
from urllib.parse import urlparse
from .integrity import EXPECTED,SCHEDULE,station,validate_day,atomic_json

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def normalized(s):
    s=s.lower().replace('đ','d');return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode())
NAMES={normalized(s):s for row in SCHEDULE for s in row}
NAMES.update({'tphochiminh':'TP.HCM','hochiminh':'TP.HCM','hcm':'TP.HCM','thanhphohochiminh':'TP.HCM'})
def name(s):return NAMES.get(normalized(s))
def signature(obj, tails=False):
    return {station(r['station']):sorted((p['prize'],p['tail'] if tails else p['value']) for p in r['results']) for r in obj['draws']}
def legacy_tail_day(obj):
    """Separate, unverified sensitivity cohort; only historical DB length 5 allowed."""
    d=date.fromisoformat(obj['date'])
    if d.year>=2026:raise ValueError('not historical')
    rows=obj['draws'];names=[station(r['station']) for r in rows]
    if not names or len(names)!=len(set(names)):raise ValueError('duplicate/empty station')
    changed=0
    for r in rows:
        if r.get('date')!=obj['date'] or r.get('result_count')!=18 or len(r['results'])!=18:raise ValueError('bad draw count/date')
        counts={k:0 for k in EXPECTED};tails=[]
        for p in r['results']:
            k=p['prize'];v=p['value'];_,length=EXPECTED[k]
            if k=='giai_db' and isinstance(v,str) and re.fullmatch(r'[0-9]{5}',v):changed+=1
            elif not isinstance(v,str) or not re.fullmatch(r'[0-9]{'+str(length)+'}',v):raise ValueError('bad historical shape')
            if p['tail']!=v[-2:]:raise ValueError('tail mismatch')
            counts[k]+=1;tails.append(v[-2:])
        if tails!=r['tails'] or any(counts[k]!=n for k,(n,l) in EXPECTED.items()):raise ValueError('count/tail mismatch')
    if not changed:raise ValueError('no five-digit DB')
    return obj

def verified_path(raw):return raw.parent.parent/'verified'/raw.name

def read_day(raw):
    raw=Path(raw);obj=json.loads(raw.read_text(encoding='utf-8'));p=verified_path(raw)
    if p.exists():
        evidence=json.loads(p.read_text(encoding='utf-8'))
        legacy_tail_day(obj)
        if evidence.get('rawSha256')!=sha(raw):raise ValueError('stale verification sidecar')
        a,b=evidence['sources']; hosts={urlparse(x['url']).hostname for x in (a,b)}
        if hosts!={'xoso.com.vn','www.minhngoc.net.vn'}:raise ValueError('unrecognized source pair')
        if any(not re.fullmatch(r'[0-9a-f]{64}',x['sha256']) for x in (a,b)):raise ValueError('bad evidence digest')
        corrected=validate_day(evidence['day']);
        if corrected['date']!=obj['date'] or signature(corrected,True)!=signature(obj,True):raise ValueError('verified tails conflict')
        if evidence.get('signatureSha256')!=hashlib.sha256(json.dumps(signature(corrected),sort_keys=True,ensure_ascii=False).encode()).hexdigest():raise ValueError('sidecar digest mismatch')
        return corrected
    return validate_day(obj)

def evidence_record(raw,a,b):
    """Both independently fetched full values must agree, and all raw tails must agree."""
    original=json.loads(raw.read_text(encoding='utf-8'));legacy_tail_day(original);aobj=validate_day(a['day']);bobj=validate_day(b['day'])
    if aobj['date']!=original['date'] or bobj['date']!=original['date'] or signature(aobj)!=signature(bobj):raise ValueError('independent source mismatch')
    if signature(aobj,True)!=signature(original,True):raise ValueError('raw tail/station mismatch')
    return {'rawSha256':sha(raw),'sources':[a['source'],b['source']],'day':aobj,'signatureSha256':hashlib.sha256(json.dumps(signature(aobj),sort_keys=True,ensure_ascii=False).encode()).hexdigest()}

def values(text,n,length):
    vals=text.split()
    if len(vals)!=n or any(not re.fullmatch(r'[0-9]{'+str(length)+'}',v) for v in vals):raise ValueError('bad prize cell')
    return vals

def draw(d,st,prizes,source):
    results=[{'prize':k,'value':v,'tail':v[-2:]} for k in EXPECTED for v in prizes[k]]
    return {'date':d,'station':st,'results':results,'tails':[r['tail'] for r in results],'result_count':len(results),'source':source}

def parse_xoso(html,d,source):
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(html,'html.parser');date_label=date.fromisoformat(d).strftime('%d/%m/%Y')
    if not any(date_label in h.get_text(' ',strip=True) for h in soup.find_all(['h1','h2'])):raise ValueError('page date not confirmed')
    labels=['8','7','6','5','4','3','2','1','db']; candidates=[]
    for table in soup.find_all('table'):
        rows=[[c.get_text(' ',strip=True) for c in tr.find_all(['td','th'],recursive=False)] for tr in table.find_all('tr') if tr.find_parent('table') is table]
        for i,h in enumerate(rows):
            names=[name(x) for x in h[1:]]
            if not names or None in names or len(set(names))!=len(names) or len(names) not in (3,4):continue
            if len(rows)<i+10:continue
            try:
                prizes=[{} for _ in names]
                for j,(key,(n,l)) in enumerate(EXPECTED.items()):
                    r=rows[i+j+1]; label=normalized(r[0]).replace('giai','').replace('dacbiet','db')
                    if label!=labels[j] or len(r)!=len(names)+1:raise ValueError('unexpected prize row')
                    for k,c in enumerate(r[1:]):prizes[k][key]=values(c,n,l)
                candidates.append(validate_day({'date':d,'draws':[draw(d,st,p,source) for st,p in zip(names,prizes)]}))
            except (ValueError,IndexError):continue
    if len(candidates)!=1:raise ValueError('expected exactly one named result table')
    return candidates[0]

def parse_minhngoc(html,d,source):
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(html,'html.parser');date_label=date.fromisoformat(d).strftime('%d/%m/%Y'); candidates=[]
    # Minh Ngoc publishes several days. Restrict to first dated result block and reject ambiguity.
    for table in soup.find_all('table'):
        txt=table.get_text(' ',strip=True)
        if date_label not in txt:continue
        dates=set(re.findall(r'\b\d{2}/\d{2}/\d{4}\b',txt))
        if dates!={date_label}:continue
        found={}
        for sub in table.find_all('table'):
            rows=[tr.get_text(' ',strip=True) for tr in sub.find_all('tr') if tr.find_parent('table') is sub]
            for i,row in enumerate(rows):
                st=name(row)
                if not st:
                    # Header may include ticket-series text; use exact station link instead.
                    trs=[tr for tr in sub.find_all('tr') if tr.find_parent('table') is sub]
                    names={name(a.get_text(' ',strip=True)) for a in trs[i].find_all('a')};names.discard(None)
                    if len(names)==1:st=names.pop()
                if not st:continue
                for offset in (1,2):
                    try:
                        p={k:values(rows[i+offset+j],n,l) for j,(k,(n,l)) in enumerate(EXPECTED.items())};r=draw(d,st,p,source)
                        if st in found and found[st]!=r:raise ValueError('ambiguous station')
                        found[st]=r
                    except (IndexError,ValueError):continue
        if len(found) in (3,4):
            try:candidates.append(validate_day({'date':d,'draws':list(found.values())}))
            except ValueError:continue
    unique={json.dumps(signature(x),sort_keys=True,ensure_ascii=False):x for x in candidates}
    if len(unique)!=1:raise ValueError('Minh Ngoc date/station structure not confirmed')
    return next(iter(unique.values()))

def fetch_pair(dt,session):
    ds=dt.isoformat();f=dt.strftime('%d-%m-%Y');out=[]
    for url,parser in [(f'https://xoso.com.vn/xsmn-{f}.html',parse_xoso),(f'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/{f}.html',parse_minhngoc)]:
        r=session.get(url,timeout=25);r.raise_for_status();source={'url':url,'sha256':hashlib.sha256(r.content).hexdigest()};out.append({'source':source,'day':parser(r.text,ds,source)})
    if signature(out[0]['day'])!=signature(out[1]['day']):raise ValueError('source disagreement')
    return out
