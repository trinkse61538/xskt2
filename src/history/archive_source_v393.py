"""Archive-only source parser. No change to canonical ingest or raw data."""
import hashlib, re, unicodedata
from datetime import date
from urllib.parse import urlparse
from bs4 import BeautifulSoup

SOURCES={'xoso':'xoso.com.vn','xosonet':'xoso.net.vn','daiphat':'xosodaiphat.com','minhngoc':'www.minhngoc.net.vn'}
EXPECTED={f'giai_{k}':(n,l) for k,n,l in [('8',1,2),('7',1,3),('6',3,4),('5',1,4),('4',7,5),('3',2,5),('2',1,5),('1',1,5),('db',1,6)]}
STATIONS='TP.HCM|Đồng Tháp|Cà Mau|Bến Tre|Vũng Tàu|Bạc Liêu|Đồng Nai|Cần Thơ|Sóc Trăng|Tây Ninh|An Giang|Bình Thuận|Vĩnh Long|Bình Dương|Trà Vinh|Long An|Bình Phước|Hậu Giang|Tiền Giang|Kiên Giang|Đà Lạt'.split('|')
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s.lower().replace('đ','d')).encode('ascii','ignore').decode())
NAMES={norm(s):s for s in STATIONS};NAMES.update({x:'TP.HCM' for x in ('tphochiminh','hochiminh','hcm','thanhphohochiminh')})
def dates(s):
    out=set()
    for d,m,y in re.findall(r'(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?!\d)',s):
        try:out.add(date(int(y),int(m),int(d)).isoformat())
        except ValueError:pass
    return out

def key(s):
    s=norm(s);s=s[4:] if s.startswith('giai') else s[1:] if s.startswith('g') else s
    return 'giai_'+{'tam':'8','bay':'7','sau':'6','nam':'5','tu':'4','ba':'3','nhi':'2','nhat':'1','dacbiet':'db'}.get(s,s)
def rows(t):return [[c.get_text(' ',strip=True) for c in r.find_all(['td','th'],recursive=False)] for r in t.find_all('tr') if r.find_parent('table') is t]
def station_name(s):
    n=NAMES.get(norm(s))
    if n is None:raise ValueError('unknown station '+s)
    return n

def make_day(ds, columns, source, kind):
    draws=[];notes=[]
    for st,p in columns:
        if set(p)!=set(EXPECTED):raise ValueError('incomplete prize labels')
        # Only the observed historical G8/G7 reversal, not arbitrary length repairs.
        if ds<'2026-01-01' and st=='Bình Phước' and date.fromisoformat(ds).weekday()==5 and len(p['giai_8'])==len(p['giai_7'])==1 and re.fullmatch(r'[0-9]{3}',p['giai_8'][0]) and re.fullmatch(r'[0-9]{2}',p['giai_7'][0]):
            notes.append({'station':st,'rule':'historical G8/G7 label swap','originalG8':p['giai_8'][0],'originalG7':p['giai_7'][0]})
            p={**p,'giai_8':p['giai_7'],'giai_7':p['giai_8']}
        results=[]
        for k,(n,l) in EXPECTED.items():
            vals=p[k];lengths={l,5} if k=='giai_db' and ds<'2026-01-01' else {l}
            if len(vals)!=n or any(not re.fullmatch(r'[0-9]+',v) or len(v) not in lengths for v in vals):raise ValueError(f'{st}: invalid {k} count/length')
            results.extend({'prize':k,'value':v,'tail':v[-2:]} for v in vals)
        draws.append({'date':ds,'station':st,'results':results,'tails':[r['tail'] for r in results],'result_count':18,'source':source})
    if len(draws) not in (3,4) or len({r['station'] for r in draws})!=len(draws):raise ValueError('incomplete or duplicate stations')
    # Keep known schedule order when available, as in v3; historic source order otherwise.
    schedule=[['TP.HCM','Đồng Tháp','Cà Mau'],['Bến Tre','Vũng Tàu','Bạc Liêu'],['Đồng Nai','Cần Thơ','Sóc Trăng'],['Tây Ninh','An Giang','Bình Thuận'],['Vĩnh Long','Bình Dương','Trà Vinh'],['TP.HCM','Long An','Bình Phước','Hậu Giang'],['Tiền Giang','Kiên Giang','Đà Lạt']][date.fromisoformat(ds).weekday()]
    if {r['station'] for r in draws}==set(schedule):draws.sort(key=lambda r:schedule.index(r['station']))
    elif ds>='2026-01-01':raise ValueError('current station schedule mismatch')
    return {'source':{**source,'normalizations':notes},'day':{'date':ds,'draws':draws}}

def signature(day):return {r['station']:sorted((p['prize'],p['value']) for p in r['results']) for r in day['draws']}

def parse(kind,html,ds,url):
    u=urlparse(url)
    if u.scheme!='https' or u.hostname!=SOURCES[kind] or dates(u.path)!={ds}:raise ValueError('wrong date or host in final URL: '+url)
    soup=BeautifulSoup(html,'lxml')
    if soup.title is None or dates(soup.title.get_text(' ',strip=True))!={ds}:raise ValueError('page title date mismatch')
    source={'url':url,'sha256':hashlib.sha256(html).hexdigest(),'parser':'archive-v393','normalizations':[]}
    candidates=[];errors=[]
    selectors={'xoso':'table.table-xsmn.table-result','daiphat':'table.table-xsmn','xosonet':'table.table-result','minhngoc':'table.bkqmiennam'}
    for t in soup.select(selectors[kind]):
        try:
            if kind=='minhngoc':
                if dates(t.get_text(' ',strip=True))!={ds}:raise ValueError('result table date mismatch')
                columns=[]
                for sub in t.select('table.rightcl'):
                    rr=[r.get_text(' ',strip=True) for r in sub.find_all('tr') if r.find_parent('table') is sub]
                    if len(rr)!=11:raise ValueError('unexpected Minh Ngoc row count')
                    columns.append((station_name(rr[0]),{k:v.split() for k,v in zip(EXPECTED,rr[2:])}))
            else:
                h=next((x for x in t.find_all_previous(['h1','h2','h3','h4']) if dates(x.get_text(' ',strip=True))),None)
                if h is None or dates(h.get_text(' ',strip=True))!={ds}:raise ValueError('result heading date mismatch')
                rr=rows(t)
                if len(rr)<10 or len(rr[0]) not in (4,5):raise ValueError('invalid header')
                names=[station_name(x) for x in rr[0][1:]];columns=[(n,{}) for n in names]
                for r in rr[1:]:
                    if not r:continue
                    k=key(r[0]);
                    if k not in EXPECTED:
                        if all(not p for _,p in columns):continue
                        raise ValueError('unexpected row label')
                    if len(r)!=len(names)+1 or k in columns[0][1]:raise ValueError('duplicate or incomplete prize row')
                    for (_,p),v in zip(columns,r[1:]):p[k]=v.split()
            candidates.append(make_day(ds,columns,source,kind))
        except ValueError as e:errors.append(str(e))
    if not candidates:raise ValueError('no complete dated result table: '+('; '.join(errors[:3]) or 'no result table'))
    if any(signature(c['day'])!=signature(candidates[0]['day']) for c in candidates):raise ValueError('conflicting result tables')
    return candidates[0]

def validate_pair(a,b):
    if a['day']['date']!=b['day']['date'] or signature(a['day'])!=signature(b['day']):raise ValueError('source disagreement')
    if a['source'].get('normalizations') and b['source'].get('normalizations'):raise ValueError('no unnormalized corroborating source')
    if urlparse(a['source']['url']).hostname==urlparse(b['source']['url']).hostname:raise ValueError('same source domain')
    return a,b

def fetch_archive_pair(dt,session):
    ds=dt.isoformat();f=dt.strftime('%d-%m-%Y'); urls={'xoso':f'https://xoso.com.vn/xsmn-{f}.html','xosonet':f'https://xoso.net.vn/xsmn-{f}.html','daiphat':f'https://xosodaiphat.com/xsmn-{f}.html','minhngoc':f'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/{f}.html'}
    candidates=[];errors=[]
    for kind in (['xoso','xosonet','daiphat'] if dt.year<2008 else ['xoso','minhngoc','daiphat','xosonet']):
        try:
            r=session.get(urls[kind],timeout=25);r.raise_for_status();a=parse(kind,r.content,ds,r.url)
            candidates.append(a)
        except Exception as e:errors.append(f'{kind}: {e}');continue
    if len(candidates)<2:raise ValueError('fewer than two usable sources: '+'; '.join(errors))
    # Never promote a date if usable sources disagree.
    if any(signature(a['day'])!=signature(candidates[0]['day']) for a in candidates):raise ValueError('usable source disagreement; manual review required')
    candidates.sort(key=lambda a:bool(a['source'].get('normalizations')))
    return validate_pair(*candidates[:2])
