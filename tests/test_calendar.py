from datetime import date
from src.universal.calendar import sexagenary_day_index,day_pillar,year_pillar,current_solar_term

def test_known_cycle_anchor(): assert sexagenary_day_index(date(2000,1,7))==0

def test_day_deterministic(): assert day_pillar(date(2026,9,1))==day_pillar(date(2026,9,1))

def test_boundaries_exist():
    for d in [date(2026,1,1),date(2028,2,29),date(2050,12,31)]: assert current_solar_term(d)["name"]

def test_2026_09_01_reference_context():
    from src.universal.calendar import context
    c=context(date(2026,9,1))
    assert c['year']['label']=='Bính Ngọ'
    assert c['month']['label']=='Bính Thân'
    assert c['day']['label']=='Mậu Dần'
    assert c['officer']=='Phá'
    assert c['nayin']['name']=='Thành Đầu Thổ'
