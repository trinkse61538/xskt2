import copy
import pytest
from src.history.archive_v393 import normalize_day,reconcile,no_draw_sources,EXPECTED
D='2005-10-08'
def raw():
    draws=[]
    for st in ['TP.HCM','Long An','Bình Phước','Hậu Giang']:
        ps=[{'prize':k,'value':'1'* (5 if k=='giai_db' else l),'tail':'11'} for k,(n,l) in EXPECTED.items() for _ in range(n)]
        draws.append({'date':D,'station':st,'results':ps,'tails':['11']*18,'result_count':18})
    return {'date':D,'draws':draws}
def candidate(host,obj):return {'source':{'url':f'https://{host}/xsmn-08-10-2005.html','sha256':'a'*64,'normalizations':[]},'day':obj}
def pair(a,b):return [candidate('xoso.com.vn',a),candidate('xoso.net.vn',b)]
def test_swapped_labels_preserve_values():
    r=raw();p=r['draws'][2]['results'];p[0]['prize'],p[1]['prize']=p[1]['prize'],p[0]['prize'];before=copy.deepcopy(r);fixed,n=normalize_day(r,D);assert r==before and len(n)==1;assert reconcile(D,r,pair(raw(),raw()))['status']=='cross_checked'
def test_tail_only_prefix_disagreement():
    a=raw();b=copy.deepcopy(a);b['draws'][0]['results'][-1]['value']='9'+'1'*5;assert reconcile(D,a,pair(a,b))['status']=='tail_verified'
def test_conflicting_tail_rejected():
    a=raw();b=copy.deepcopy(a);b['draws'][0]['results'][0].update(value='12',tail='12');b['draws'][0]['tails'][0]='12'
    with pytest.raises(ValueError,match='disagreement'):reconcile(D,a,pair(a,b))
def test_raw_conflict_rejected():
    a=raw();b=copy.deepcopy(a);b['draws'][0]['results'][0].update(value='12',tail='12');b['draws'][0]['tails'][0]='12'
    with pytest.raises(ValueError,match='raw/source'):reconcile(D,b,pair(a,a))
def test_no_draw_bounds():
    assert no_draw_sources('2020-04-01') and no_draw_sources('2020-04-28') and not no_draw_sources('2020-04-29');assert no_draw_sources('2021-07-09') and no_draw_sources('2021-10-21') and not no_draw_sources('2021-10-22')
def test_missing_raw_two_sources():assert reconcile(D,None,pair(raw(),raw()))['status']=='cross_checked'
