from __future__ import annotations
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from .constants import *

TZ = ZoneInfo("Asia/Ho_Chi_Minh")

def jdn(d: date) -> int:
    a=(14-d.month)//12; y=d.year+4800-a; m=d.month+12*a-3
    return d.day+(153*m+2)//5+365*y+y//4-y//100+y//400-32045

def sexagenary_day_index(d: date) -> int:
    # 0 = Giáp Tý. Standard JDN cycle convention.
    return (jdn(d)+49)%60

def year_pillar_index(d: date) -> int:
    lichun=solar_term_datetime(d.year,2).date()
    y=d.year if d>=lichun else d.year-1
    return (y-1984)%60  # 1984 = Giáp Tý

def solar_term_datetime(year:int,index:int) -> datetime:
    # Mean solar-term algorithm, deterministic for project range.
    base=datetime(1900,1,6,2,5,tzinfo=timezone.utc)
    millis=31556925974.7*(year-1900)+SOLAR_TERM_MINUTES[index]*60000
    return (base+timedelta(milliseconds=millis)).astimezone(TZ)

def solar_terms_around(year:int):
    out=[]
    for y in (year-1,year,year+1):
        for i,name in enumerate(SOLAR_TERM_NAMES): out.append((solar_term_datetime(y,i),i,name))
    return sorted(out)

def current_solar_term(d:date):
    noon=datetime(d.year,d.month,d.day,12,tzinfo=TZ)
    terms=[x for x in solar_terms_around(d.year) if x[0]<=noon]
    dt,i,name=terms[-1]
    return {"name":name,"index":i,"started_at":dt.isoformat()}

def solar_month_number(d:date)->int:
    # 1=Dần, 2=Mão ... 12=Sửu, boundaries are Jie terms.
    noon=datetime(d.year,d.month,d.day,12,tzinfo=TZ)
    bounds=[]
    for y in (d.year-1,d.year,d.year+1):
        for month_no,idx in enumerate(JIE_TERM_INDEXES,1):
            yy=y if idx!=0 else y+1
            bounds.append((solar_term_datetime(yy,idx),month_no))
    past=[x for x in bounds if x[0]<=noon]
    return sorted(past)[-1][1]

def month_branch_index(d:date)->int:
    return (2 + solar_month_number(d)-1)%12

def month_stem_index(d:date)->int:
    ys=year_pillar_index(d)%10
    # Dần month stem: Giáp/Kỷ year -> Bính; Ất/Canh -> Mậu; Bính/Tân -> Canh; Đinh/Nhâm -> Nhâm; Mậu/Quý -> Giáp.
    start={0:2,5:2,1:4,6:4,2:6,7:6,3:8,8:8,4:0,9:0}[ys]
    return (start+solar_month_number(d)-1)%10

def pillar_label(idx:int)->str: return STEMS[idx%10]+" "+BRANCHES[idx%12]

def day_pillar(d:date):
    idx=sexagenary_day_index(d); return {"index":idx,"stem":idx%10,"branch":idx%12,"label":pillar_label(idx)}

def year_pillar(d:date):
    idx=year_pillar_index(d); return {"index":idx,"stem":idx%10,"branch":idx%12,"label":pillar_label(idx)}

def month_pillar(d:date):
    s=month_stem_index(d); b=month_branch_index(d)
    idx=next(i for i in range(60) if i%10==s and i%12==b)
    return {"index":idx,"stem":s,"branch":b,"label":STEMS[s]+" "+BRANCHES[b],"solar_month":solar_month_number(d)}

def hour_branch_index(hour:int)->int: return ((hour+1)//2)%12

def hour_stem_index(day_stem:int,hour_branch:int)->int:
    zi_start=(day_stem%5)*2
    return (zi_start+hour_branch)%10

def hour_pillar(d:date,hour:int,minute:int=0):
    day=day_pillar(d); b=hour_branch_index(hour); s=hour_stem_index(day["stem"],b)
    idx=next(i for i in range(60) if i%10==s and i%12==b)
    return {"index":idx,"stem":s,"branch":b,"label":STEMS[s]+" "+BRANCHES[b]}

def officer(d:date)->str:
    return OFFICERS[(day_pillar(d)["branch"]-month_branch_index(d))%12]

def nayin(d:date):
    idx=sexagenary_day_index(d); name,element=NAYIN[idx//2]
    return {"name":name,"element":element}

def context(d:date):
    return {"date":d.isoformat(),"timezone":"Asia/Ho_Chi_Minh","solar_term":current_solar_term(d),"year":year_pillar(d),"month":month_pillar(d),"day":day_pillar(d),"officer":officer(d),"nayin":nayin(d)}
