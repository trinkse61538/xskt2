from datetime import date
from ..universal.calendar import year_pillar, month_pillar, day_pillar, hour_pillar
from ..universal.constants import STEM_ELEMENT, BRANCH_ELEMENT, ELEMENTS

def pillars(birth_date:date,hour:int,minute:int=0):
    return {"year":year_pillar(birth_date),"month":month_pillar(birth_date),"day":day_pillar(birth_date),"hour":hour_pillar(birth_date,hour,minute)}

def distribution(birth_date:date,hour:int,minute:int=0):
    p=pillars(birth_date,hour,minute)
    weights={"year":1.0,"month":2.0,"day":2.0,"hour":1.0}
    counts={e:0.0 for e in ELEMENTS}; total=0
    for name,pil in p.items():
        w=weights[name]
        counts[STEM_ELEMENT[pil["stem"]]]+=w
        counts[BRANCH_ELEMENT[pil["branch"]]]+=w
        total+=2*w
    dist={e:counts[e]/total for e in ELEMENTS}
    deficits={e:.20-dist[e] for e in ELEMENTS}; maxabs=max(abs(x) for x in deficits.values()) or 1
    affinity={e:deficits[e]/maxabs for e in ELEMENTS}
    return {"pillars":p,"distribution":dist,"affinity":affinity,"method":"elemental-balance-v1"}
