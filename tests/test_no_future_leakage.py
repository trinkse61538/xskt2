from datetime import date
from src.universal.engine import build_day
from src.history.integrity import atomic_json

def test_no_future_leakage(tmp_path,monkeypatch):
    monkeypatch.chdir(tmp_path);d=date(2026,9,1);before=build_day(d)['universal'];atomic_json(tmp_path/'data/history/raw/2026-09-02.json',{'date':'2026-09-02','draws':[{'tails':['00']*18}]});after=build_day(d)['universal'];assert before==after
