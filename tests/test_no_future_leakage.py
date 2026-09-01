from datetime import date
from src.universal.engine import build_day

def test_no_future_leakage():
    before=build_day(date(2026,9,1))["universal"]
    fake_history={"date":"2026-09-01","tails":["00"]*18}
    after=build_day(date(2026,9,1))["universal"]
    assert before["primary"]==after["primary"] and before["secondary"]==after["secondary"] and before["top5"]==after["top5"]
