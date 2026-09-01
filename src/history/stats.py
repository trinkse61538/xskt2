from collections import Counter

def score_picks(picks,draws):
    if not draws:return {"win":False,"hit_numbers":[],"total_nhay":0,"by_number":{p:0 for p in picks}}
    tails=[t for d in draws for t in d.get("tails",[])]
    c=Counter(tails); by={p:c[p] for p in picks}; hits=[p for p in picks if by[p]>0]
    return {"win":bool(hits),"hit_numbers":hits,"total_nhay":sum(by.values()),"by_number":by}

def theoretical_baseline(npicks=2,nresults=18): return 1-(1-npicks/100)**nresults
