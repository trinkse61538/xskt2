from datetime import date
from .bazi import distribution
from ..universal.constants import DIGIT_ELEMENT

def apply_overlay(universal_record,birth_date:date,birth_hour:int,birth_minute:int=0):
    prof=distribution(birth_date,birth_hour,birth_minute)
    universe=universal_record["universal"]["ranking"]
    candidates=universe[:20]; rest=universe[20:]
    out=[]
    for r in candidates:
        es=[DIGIT_ELEMENT[c] for c in r["number"]]
        affinity=sum(prof["affinity"][e] for e in es)/2
        personal_component=(affinity+1)/2*100
        final=.80*r["score"]+.20*personal_component
        out.append({"number":r["number"],"universal_rank":r["rank"],"universal_score":r["score"],"personal_component":round(personal_component,3),"personal_score":round(final,3),"delta_component":round(personal_component-r["score"],3)})
    out.sort(key=lambda x:(-x["personal_score"],x["universal_rank"],int(x["number"])))
    for i,r in enumerate(out,1): r["personal_rank"]=i
    return {"engine_version":"personal-overlay-v1.0","formula":"0.80 universal + 0.20 personal elemental balance","candidate_pool":"universal-top20","profile_analysis":prof,"primary":out[0]["number"],"secondary":out[1]["number"],"top5":[x["number"] for x in out[:5]],"ranking":out}
