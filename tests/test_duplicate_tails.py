from src.history.stats import score_picks

def test_duplicate_nhay_preserved():
    d=[{"tails":["38","38","12"]}];s=score_picks(["38","99"],d)
    assert s["win"] and s["by_number"]["38"]==2 and s["total_nhay"]==2
