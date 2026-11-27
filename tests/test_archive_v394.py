import copy
import pytest
from src.history.archive_v394 import reconcile
from src.history.archive_v393 import EXPECTED, signature
D='2005-10-13'
N=['Tây Ninh','An Giang','Bình Thuận']
def day():
    rows=[]
    for i,n in enumerate(N,1):
        ps=[{'prize':k,'value':str(i)*l,'tail':str(i)*2} for k,(c,l) in EXPECTED.items() for _ in range(c)]
        rows.append({'date':D,'station':n,'results':ps,'tails':[str(i)*2]*18,'result_count':18})
    return {'date':D,'draws':rows}
def pair(a,b=None):
    return [{'source':{'url':f'https://{h}/xsmn-13-10-2005.html','sha256':'a'*64},'day':d} for h,d in zip(['xoso.com.vn','xoso.net.vn'],[a,a if b is None else b])]
def swap(d):
    a=copy.deepcopy(d);a['draws'][0]['station'],a['draws'][1]['station']=a['draws'][1]['station'],a['draws'][0]['station'];return a
def change_tail(row):
    row['results'][0].update(value='99',tail='99');row['tails'][0]='99'
def test_unique_permutation_preserves_raw():
    a=day();raw=swap(a);before=copy.deepcopy(raw);r=reconcile(D,raw,pair(a));assert raw==before;assert r['status']=='cross_checked';assert signature(r['day'])==signature(a);assert r['stationCorrection']['mapping']=={'Tây Ninh':'An Giang','An Giang':'Tây Ninh','Bình Thuận':'Bình Thuận'}
def test_full_prefix_difference_is_tail_only():
    a=day();raw=swap(a);raw['draws'][0]['results'][-1]['value']='9'+'1'*5;r=reconcile(D,raw,pair(a));assert r['status']=='tail_verified';assert not r['stationCorrection']['rawFullMatchesAfterMapping']
def test_disagreeing_sources_not_corrected():
    a=day();b=copy.deepcopy(a);change_tail(b['draws'][0]);
    with pytest.raises(ValueError,match='source tail/station disagreement'):reconcile(D,swap(a),pair(a,b))
def test_duplicate_hosts_rejected():
    a=day();cs=pair(a);cs[1]['source']['url']=cs[0]['source']['url']
    with pytest.raises(ValueError,match='distinct'):reconcile(D,swap(a),cs)
def test_actual_tail_mismatch_rejected():
    a=day();raw=swap(a);change_tail(raw['draws'][0]);
    with pytest.raises(ValueError,match='no unique'):reconcile(D,raw,pair(a))
def test_station_set_change_rejected():
    a=day();raw=swap(a);raw['draws'][0]['station']='Đồng Nai'
    with pytest.raises(ValueError,match='station set mismatch'):reconcile(D,raw,pair(a))
def test_ambiguous_permutation_rejected():
    a=day();a['draws'][1]['results']=copy.deepcopy(a['draws'][0]['results']);a['draws'][1]['tails']=a['draws'][0]['tails'][:];raw=copy.deepcopy(a);raw['draws'][0]['station'],raw['draws'][2]['station']=raw['draws'][2]['station'],raw['draws'][0]['station']
    with pytest.raises(ValueError,match='no unique'):reconcile(D,raw,pair(a))
def test_existing_agreement_unchanged():
    a=day();r=reconcile(D,a,pair(a));assert r['status']=='cross_checked' and 'stationCorrection' not in r
