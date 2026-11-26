import json
from datetime import date
from src.history.integrity import EXPECTED,SCHEDULE,validate_day,atomic_json,days

def fixture():
    day='2026-11-21';results=[{'prize':k,'value':'0'*length,'tail':'00'} for k,(n,length) in EXPECTED.items() for _ in range(n)]
    return {'date':day,'draws':[{'date':day,'station':s,'results':[dict(x) for x in results],'tails':['00']*18,'result_count':18} for s in SCHEDULE[5]]}
def test_full_validation_and_duplicate_tails():
    obj=fixture();assert len(validate_day(obj)['draws'])==4;assert validate_day(obj)['draws'][0]['tails'].count('00')==18

def test_bad_prize_and_incomplete_station_rejected():
    import pytest
    obj=fixture();obj['draws'][0]['results'][0]['value']='000'
    with pytest.raises(ValueError):validate_day(obj)
    obj=fixture();obj['draws'].pop()
    with pytest.raises(ValueError):validate_day(obj)

def test_atomic_json(tmp_path):
    p=tmp_path/'a'/'b.json';atomic_json(p,fixture());assert json.loads(p.read_text())==fixture()

def test_days_leap():assert len(list(days(date(2028,2,28),date(2028,3,1))))==3

def test_global_fdr():
    from src.history.research import bh,snapshot
    t=bh([{"p":.01},{"p":.04},{"p":.03}]);assert [round(x["q"],2) for x in t]==[.03,.04,.04]
    v=snapshot({"test":[{"tails":["00"]*18}]*300});assert v["numberTests"]==400 and v["stationTests"]==1 and v["confirmedNumberTests"]>0
