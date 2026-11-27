"""Archive reconciliation. Never writes canonical history or official metrics."""
import copy, hashlib, re
from datetime import date
from urllib.parse import urlparse
from itertools import combinations
from .archive_source_v393 import EXPECTED, SOURCES, STATIONS, dates, parse

NO_DRAW=[('2020-04-01','2020-04-28',[
'https://tuoitre.vn/ve-so-mien-nam-mo-ban-tro-lai-tu-ngay-mai-29-4-20200428091049209.htm',
'https://xsktmiennam.vn/xo-so-kien-thiet-khu-vuc-mien-nam-chinh-thuc-tro-lai-tu-ngay-29-4-d500668']),
('2021-07-09','2021-10-21',[
'https://vnexpress.net/cac-tinh-mien-nam-dung-phat-hanh-ve-so-4306993.html',
'https://xsktmiennam.vn/xo-so-kien-thiet-21-tinh-thanh-khu-vuc-mien-nam-chinh-thuc-hoat-dong-tro-lai-d501024'])]

def no_draw_sources(ds):
    return next((urls for a,b,urls in NO_DRAW if a<=ds<=b),[])

def normalize_day(obj,ds):
    """Only observed G7/G8 transposition at Binh Phuoc; preserve numbers and duplicates."""
    obj=copy.deepcopy(obj); notes=[]
    if obj.get('date')!=ds:raise ValueError('date mismatch')
    rows=obj.get('draws',[]); names=[r.get('station') for r in rows]
    if len(names) not in (3,4) or len(set(names))!=len(names) or any(n not in STATIONS for n in names):raise ValueError('station count/name mismatch')
    for r in rows:
        ps=r.get('results',[])
        if r.get('date')!=ds or r.get('result_count')!=18 or len(ps)!=18:raise ValueError('bad draw count/date')
        if any(not isinstance(p.get('value'),str) or not re.fullmatch(r'[0-9]+',p['value']) or p.get('tail')!=p['value'][-2:] for p in ps) or [p['tail'] for p in ps]!=r.get('tails'):raise ValueError('original tail mismatch')
        a=[p for p in ps if p['prize']=='giai_8'];b=[p for p in ps if p['prize']=='giai_7']
        if ds<'2026-01-01' and r['station']=='Bình Phước' and date.fromisoformat(ds).weekday()==5 and len(a)==len(b)==1 and len(a[0]['value'])==3 and len(b[0]['value'])==2:
            notes.append({'station':r['station'],'rule':'raw G8/G7 swap','originalG8':a[0]['value'],'originalG7':b[0]['value']});a[0]['prize']='giai_7';b[0]['prize']='giai_8'
        for k,(n,l) in EXPECTED.items():
            v=[p for p in ps if p['prize']==k]; allowed={l,5} if k=='giai_db' and ds<'2026-01-01' else {l}
            if len(v)!=n or any(len(p['value']) not in allowed for p in v):raise ValueError(f'{r["station"]}: invalid {k} count/length')
        r['results']=sorted(ps,key=lambda p:list(EXPECTED).index(p['prize']));r['tails']=[p['tail'] for p in r['results']]
    return obj,notes

def signature(obj,tail=False):
    return {r['station']:sorted((p['prize'],p['tail' if tail else 'value']) for p in r['results']) for r in obj['draws']}

def validate_candidate(c,ds):
    s=c['source'];u=urlparse(s['url']);
    if u.scheme!='https' or u.hostname not in SOURCES.values() or dates(u.path)!={ds} or not re.fullmatch(r'[0-9a-f]{64}',s.get('sha256','')):raise ValueError('source provenance invalid')
    day,notes=normalize_day(c['day'],ds)
    if notes:raise ValueError('candidate parser did not normalize')
    return {'source':s,'day':day}

def differences(a,b,tail=False):
    aa=signature(a,tail);bb=signature(b,tail);out=[]
    for st in sorted(set(aa)|set(bb)):
        for k in EXPECTED:
            x=[v for p,v in aa.get(st,[]) if p==k];y=[v for p,v in bb.get(st,[]) if p==k]
            if x!=y:out.append({'station':st,'prize':k,'raw':x,'source':y})
    return out

def reconcile(ds,raw,candidates):
    cs=[validate_candidate(c,ds) for c in candidates];hosts=[urlparse(c['source']['url']).hostname for c in cs]
    if len(set(hosts))!=len(hosts) or len(cs)<2:raise ValueError('fewer than two distinct usable sources')
    base=cs[0]['day']; rawday=None; notes=[]
    if raw is not None:rawday,notes=normalize_day(raw,ds)
    # No majority override of conflicting tails. Compare named stations, prize labels, duplicates.
    if any(signature(c['day'],True)!=signature(base,True) for c in cs):raise ValueError('source tail/station disagreement')
    if rawday is not None and signature(rawday,True)!=signature(base,True):raise ValueError('raw/source tail or station mismatch')
    full=all(signature(c['day'])==signature(base) for c in cs) and any(not c['source'].get('normalizations') for c in cs)
    # If raw differs only in the first digit of DB, do not assert a full raw match.
    if rawday is not None and signature(rawday)!=signature(base):full=False
    # For tail-only status preserve the raw representation, never choose a full value as truth.
    return {'status':'cross_checked' if full else 'tail_verified','day':base if full or rawday is None else rawday,'evidence':[c['source'] for c in cs],'normalizations':notes,'fullAgreement':full,'sourceDifferences':[{'url':c['source']['url'],'differences':differences(base,c['day'])} for c in cs[1:] if signature(c['day'])!=signature(base)],'rawDifferences':differences(rawday,base) if rawday else []}

def fetch_candidates(dt,session):
    ds=dt.isoformat();f=dt.strftime('%d-%m-%Y'); urls={'xoso':f'https://xoso.com.vn/xsmn-{f}.html','xosonet':f'https://xoso.net.vn/xsmn-{f}.html','daiphat':f'https://xosodaiphat.com/xsmn-{f}.html','minhngoc':f'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/{f}.html'}
    out=[]; errors=[]
    for k in (['xoso','xosonet','daiphat'] if dt.year<2008 else ['xoso','minhngoc','daiphat','xosonet']):
        try:
            r=session.get(urls[k],timeout=25);r.raise_for_status();out.append(parse(k,r.content,ds,r.url))
        except Exception as e:errors.append({'source':k,'reason':str(e)})
    return out,errors
