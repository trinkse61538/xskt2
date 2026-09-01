from datetime import date
from src.universal.engine import build_day

def test_rank_100_unique():
    r=build_day(date(2026,9,1)); nums=[x["number"] for x in r["universal"]["ranking"]]
    assert len(nums)==100 and len(set(nums))==100 and len(r["universal"]["top5"])==5

def test_score_not_probability_label():
    r=build_day(date(2026,9,1)); assert "not predictive probabilities" in r["explain"]["note"]
