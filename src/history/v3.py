"""V3 integrity: immutable raw, independently compared corrections, named station parsing."""
import hashlib,json,re,unicodedata
from pathlib import Path
from datetime import date
PARSER_VERSION = "3.0.1"
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

def validate_source_day(obj):
    """Current records remain strict; historical 5-digit DB accepted only as source evidence."""
    try:
        return validate_day(obj)
    except ValueError:
        obj=legacy_tail_day(obj)
        d=date.fromisoformat(obj['date']); rows=obj['draws']; names=[station(r['station']) for r in rows]
        if set(names)==set(SCHEDULE[d.weekday()]):
            rows=sorted(rows,key=lambda r:SCHEDULE[d.weekday()].index(station(r['station'])))
        return {'date':obj['date'],'draws':[{**r,'station':station(r['station'])} for r in rows]}

def compatible_raw(original, corrected):
    """Never silently change non-DB full values; only a matching DB suffix may differ."""
    if signature(original,True)!=signature(corrected,True):return False
    a,b=signature(original),signature(corrected)
    for st in a:
        if [(k,v) for k,v in a[st] if k!='giai_db'] != [(k,v) for k,v in b[st] if k!='giai_db']:return False
        x=next(v for k,v in a[st] if k=='giai_db');y=next(v for k,v in b[st] if k=='giai_db')
        if x!=y and not (len(x)==5 and len(y)==6 and y.endswith(x)):return False
    return True

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
        corrected=validate_source_day(evidence['day']);
        if corrected['date']!=obj['date'] or not compatible_raw(obj,corrected):raise ValueError('verified tails conflict')
        if evidence.get('signatureSha256')!=hashlib.sha256(json.dumps(signature(corrected),sort_keys=True,ensure_ascii=False).encode()).hexdigest():raise ValueError('sidecar digest mismatch')
        return corrected
    return validate_day(obj)

def evidence_record(raw,a,b):
    """Both independently fetched full values must agree, and all raw tails must agree."""
    original=json.loads(raw.read_text(encoding='utf-8'));legacy_tail_day(original);aobj=validate_source_day(a['day']);bobj=validate_source_day(b['day'])
    if aobj['date']!=original['date'] or bobj['date']!=original['date'] or signature(aobj)!=signature(bobj):raise ValueError('independent source mismatch')
    if not compatible_raw(original,aobj):raise ValueError('raw full-value/station mismatch')
    return {'rawSha256':sha(raw),'sources':[a['source'],b['source']],'day':aobj,'signatureSha256':hashlib.sha256(json.dumps(signature(aobj),sort_keys=True,ensure_ascii=False).encode()).hexdigest()}

def values(text,n,length,legacy_db=False):
    vals=text.split(); lengths={length,5} if legacy_db else {length}
    if len(vals)!=n or any(len(v) not in lengths or not re.fullmatch(r'[0-9]+',v) for v in vals):raise ValueError('bad prize cell')
    return vals

def draw(d,st,prizes,source):
    results=[{'prize':k,'value':v,'tail':v[-2:]} for k in EXPECTED for v in prizes[k]]
    return {'date':d,'station':st,'results':results,'tails':[r['tail'] for r in results],'result_count':len(results),'source':source}

LABELS={'8':'giai_8','tam':'giai_8','7':'giai_7','bay':'giai_7','6':'giai_6','sau':'giai_6','5':'giai_5','nam':'giai_5','4':'giai_4','tu':'giai_4','3':'giai_3','ba':'giai_3','2':'giai_2','nhi':'giai_2','1':'giai_1','nhat':'giai_1','db':'giai_db','dacbiet':'giai_db'}
def label(s):
    k=normalized(s)
    if k.startswith('giai'):k=k[4:]
    elif k.startswith('g'):k=k[1:]
    return LABELS.get(k)

def date_tokens(text):
    out=set()
    for day,month,year in re.findall(r'(?<![0-9])([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})(?![0-9])',text):
        try:out.add(date(int(year),int(month),int(day)).isoformat())
        except ValueError:pass
    return out

def table_rows(table):
    return [tr for tr in table.find_all('tr') if tr.find_parent('table') is table]

def cells(tr):return [c.get_text(' ',strip=True) for c in tr.find_all(['td','th'],recursive=False)]

def historical_db(d,k):return d<'2026-01-01' and k=='giai_db'

def unique_day(candidates,source_name):
    unique={json.dumps(signature(x),sort_keys=True,ensure_ascii=False):x for x in candidates}
    if not unique:raise ValueError(f'{source_name}: no complete date/station/prize table')
    if len(unique)!=1:raise ValueError(f'{source_name}: conflicting complete result tables')
    return next(iter(unique.values()))

def horizontal(table,d,source):
    rows=[cells(tr) for tr in table_rows(table)];out=[]
    for i,h in enumerate(rows):
        names=[name(x) for x in h[1:]]
        if len(names) not in (3,4) or None in names or len(set(names))!=len(names):continue
        try:
            prizes=[{} for _ in names]
            for r in rows[i+1:i+15]:
                if not r:continue
                k=label(r[0])
                if k is None:
                    if any(prizes):break
                    continue  # e.g. ticket series row before prizes
                if len(r)!=len(names)+1 or k in prizes[0]:raise ValueError('unexpected prize row')
                n,l=EXPECTED[k]
                for j,c in enumerate(r[1:]):prizes[j][k]=values(c,n,l,historical_db(d,k))
                if len(prizes[0])==len(EXPECTED):break
            if any(set(p)!=set(EXPECTED) for p in prizes):continue
            out.append(validate_source_day({'date':d,'draws':[draw(d,st,p,source) for st,p in zip(names,prizes)]}))
        except (ValueError,IndexError,KeyError):continue
    return out

def parse_xoso(html,d,source):
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(html,'html.parser');candidates=[]
    for table in soup.find_all('table'):
        # Use nearest dated heading, not the unrelated date in navigation or page footer.
        heading=next((h for h in table.find_all_previous(['h1','h2','h3','h4']) if date_tokens(h.get_text(' ',strip=True))),None)
        if heading is None or date_tokens(heading.get_text(' ',strip=True))!={d}:continue
        candidates.extend(horizontal(table,d,source))
    return unique_day(candidates,'Xoso')

def parse_minhngoc(html,d,source):
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(html,'html.parser');candidates=[]
    for table in soup.find_all('table'):
        txt=table.get_text(' ',strip=True)
        if date_tokens(txt)!={d}:continue
        candidates.extend(horizontal(table,d,source))
        found={};conflict=False
        for sub in table.find_all('table'):
            if date_tokens(sub.get_text(' ',strip=True)) - {d}:continue
            candidates.extend(horizontal(sub,d,source))
            trs=table_rows(sub);rows=[tr.get_text(' ',strip=True) for tr in trs]
            for i,row in enumerate(rows):
                st=name(row)
                if not st:
                    names={name(a.get_text(' ',strip=True)) for a in trs[i].find_all('a')};names.discard(None)
                    if len(names)==1:st=names.pop()
                if not st:continue
                for offset in (1,2):
                    try:
                        p={k:values(rows[i+offset+j],n,l,historical_db(d,k)) for j,(k,(n,l)) in enumerate(EXPECTED.items())}
                        r=draw(d,st,p,source)
                    except (IndexError,ValueError):continue
                    if st in found and found[st]!=r:conflict=True
                    found[st]=r
        if not conflict and len(found) in (3,4):
            try:candidates.append(validate_source_day({'date':d,'draws':list(found.values())}))
            except ValueError:continue
    return unique_day(candidates,'Minh Ngoc')

def fetch_pair(dt,session):
    ds=dt.isoformat();f=dt.strftime('%d-%m-%Y');out=[];errors=[]
    sources=[('Xoso',[f'https://xoso.com.vn/xsmn-{f}.html'],parse_xoso),('Minh Ngoc',[f'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/{f}.html',f'https://www.minhngoc.net.vn/ket-qua-xo-so/{f}.html'],parse_minhngoc)]
    for title,urls,parser in sources:
        reasons=[]
        for url in urls:
            try:
                r=session.get(url,timeout=25);r.raise_for_status()
                if urlparse(r.url).hostname!=urlparse(url).hostname:raise ValueError('unexpected redirect host')
                source={'url':url,'sha256':hashlib.sha256(r.content).hexdigest()}
                out.append({'source':source,'day':parser(r.text,ds,source)});break
            except Exception as e:reasons.append(f'{url}: {type(e).__name__}: {e}')
        else:errors.append(f'{title}: '+ ' | '.join(reasons))
    if errors:raise ValueError(' ; '.join(errors))
    if signature(out[0]['day'])!=signature(out[1]['day']):raise ValueError('source disagreement (named stations / full prize values)')
    return out
