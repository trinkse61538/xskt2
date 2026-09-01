from __future__ import annotations
from datetime import date
from statistics import median
from .constants import DIGIT_ELEMENT, OFFICER_SCORE
from .calendar import context,jdn
from .seasonal_qi import states_for_date
from .relations import context_relations, number_score as canchi_score
from .gua import build_gua, number_score as gua_score
from .hetu_luoshu import score_number as hl_score

WEIGHTS={"seasonal":.30,"canchi":.20,"officer_nayin":.15,"gua":.25,"hetu_luoshu":.10}

def elements(num): return [DIGIT_ELEMENT[num[0]],DIGIT_ELEMENT[num[1]]]

def elem_affinity(candidate,ref):
    from .relations import element_affinity
    return (element_affinity(candidate,ref)+1)/2

def build_day(d:date):
    ctx=context(d); season=states_for_date(d); rels=context_relations(ctx); gua=build_gua(d,12,0); event_gua=build_gua(d,16,15)
    nayin_el=ctx["nayin"]["element"]; officer=OFFICER_SCORE[ctx["officer"]]
    rows=[]
    for n in range(100):
        num=f"{n:02d}"; es=elements(num)
        seasonal=sum(season["scores"][e] for e in es)/2
        cc=canchi_score(es,ctx)
        nay=sum(elem_affinity(e,nayin_el) for e in es)/2
        on=.40*officer+.60*nay
        gs=gua_score(es,gua)
        hs=hl_score(num,jdn(d))
        mods={"seasonal":seasonal,"canchi":cc,"officer_nayin":on,"gua":gs,"hetu_luoshu":hs}
        raw=sum(WEIGHTS[k]*mods[k] for k in WEIGHTS)
        rows.append({"number":num,"raw":raw,"modules":mods})
    lo=min(r["raw"] for r in rows); hi=max(r["raw"] for r in rows); span=hi-lo or 1
    # support = module top 20 values (20% of 00–99)
    thresholds={k:sorted((r["modules"][k] for r in rows),reverse=True)[19] for k in WEIGHTS}
    for r in rows:
        r["score"]=round((r["raw"]-lo)/span*100,3)
        r["agreement"]=sum(r["modules"][k]>=thresholds[k] for k in WEIGHTS)
        r["modules"]={k:round(v*100,3) for k,v in r["modules"].items()}
        r["raw"]=round(r["raw"],8)
    rows.sort(key=lambda r:(-r["raw"],-r["agreement"],int(r["number"])))
    for i,r in enumerate(rows,1): r["rank"]=i
    top=rows[:5]
    scores=[r["score"] for r in rows]
    separation=max(0,min(1,((top[0]["score"]-median(scores))/50 + (top[0]["score"]-top[4]["score"])/20)/2))
    agreement=top[0]["agreement"]/5
    context_coherence=(sum(season["scores"].values())/5*.35 + (OFFICER_SCORE[ctx["officer"]])*.65)
    gua_coherence=top[0]["modules"]["gua"]/100
    day_score=round(100*(.35*separation+.30*agreement+.20*context_coherence+.15*gua_coherence),2)
    agr=top[0]["agreement"]
    tier="S" if day_score>=80 and agr>=4 else "A" if day_score>=70 else "B" if day_score>=55 else "C"
    primary=top[0]["number"]; secondary=top[1]["number"]; rev=primary[::-1]
    reverse_row=next(r for r in rows if r["number"]==rev)
    return {
      "schema_version":"1.0","engine_version":"universal-v1.0","date":d.isoformat(),"timezone":"Asia/Ho_Chi_Minh",
      "calendar":ctx,"seasonal_state":season,"relations":rels,"gua":gua,
      "event_time_gua":{**event_gua,"research_only":True},
      "universal":{"day_score":day_score,"agreement":agr,"tier":tier,"month_rank":None,"primary":primary,"secondary":secondary,"top5":[r["number"] for r in top],"reverse_of_primary":rev,"reverse_rank":reverse_row["rank"],"reverse_score":reverse_row["score"],"ranking":rows},
      "explain":{"weights":WEIGHTS,"note":"Scores are deterministic ranking/coherence scores, not predictive probabilities."}
    }

def assign_month_ranks(records):
    groups={}
    for r in records: groups.setdefault(r["date"][:7],[]).append(r)
    for g in groups.values():
        ranked=sorted(g,key=lambda x:(-x["universal"]["day_score"],-x["universal"]["agreement"],x["date"]))
        for i,r in enumerate(ranked,1): r["universal"]["month_rank"]=i
    return records
