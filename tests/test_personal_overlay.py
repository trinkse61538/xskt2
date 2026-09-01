from datetime import date
from src.universal.engine import build_day
from src.personal.overlay import apply_overlay

def test_personal_top5_from_universal_top20():
    u=build_day(date(2026,9,1)); p=apply_overlay(u,date(1995,1,1),12)
    pool={x["number"] for x in u["universal"]["ranking"][:20]}
    assert set(p["top5"]).issubset(pool)
