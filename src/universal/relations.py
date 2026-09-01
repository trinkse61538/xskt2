from .constants import BRANCHES, BRANCH_ELEMENT, STEM_ELEMENT, GENERATES, CONTROLS

SIX_HARMONY={frozenset(x) for x in [(0,1),(2,11),(3,10),(4,9),(5,8),(6,7)]}
SIX_CLASH={frozenset(x) for x in [(0,6),(1,7),(2,8),(3,9),(4,10),(5,11)]}
SIX_HARM={frozenset(x) for x in [(0,7),(1,6),(2,5),(3,4),(8,11),(9,10)]}
SIX_BREAK={frozenset(x) for x in [(0,9),(1,4),(2,11),(3,6),(5,8),(7,10)]}
TRINES=[{8,0,4},{11,3,7},{2,6,10},{5,9,1}]
MEETINGS=[{11,0,1},{2,3,4},{5,6,7},{8,9,10}]
PUNISH=[{2,5,8},{1,7,10},{0,3}]

def branch_relation(a,b):
    pair=frozenset((a,b))
    if a==b:return ("same",.20)
    if any({a,b}.issubset(g) for g in TRINES): return ("tam_hop",1.0)
    if any({a,b}.issubset(g) for g in MEETINGS): return ("tam_hoi",.80)
    if pair in SIX_HARMONY:return ("luc_hop",.85)
    if pair in SIX_CLASH:return ("xung",-1.0)
    if pair in SIX_HARM:return ("hai",-.45)
    if pair in SIX_BREAK:return ("pha",-.55)
    if any({a,b}.issubset(g) for g in PUNISH):return ("hinh",-.70)
    return ("neutral",0.0)

def element_affinity(candidate,reference):
    if candidate==reference:return .75
    if GENERATES[reference]==candidate:return 1.0
    if GENERATES[candidate]==reference:return .35
    if CONTROLS[reference]==candidate:return -.65
    if CONTROLS[candidate]==reference:return -.40
    return 0.0

def context_relations(ctx):
    d,m,y=ctx["day"],ctx["month"],ctx["year"]
    pairs=[("day_month",d,m,.50),("day_year",d,y,.35),("month_year",m,y,.15)]
    out=[]
    for name,a,b,w in pairs:
        rel,val=branch_relation(a["branch"],b["branch"])
        out.append({"name":name,"relation":rel,"value":val,"weight":w,"a":BRANCHES[a["branch"]],"b":BRANCHES[b["branch"]]})
    return out

def number_score(elements,ctx):
    refs=[(STEM_ELEMENT[ctx["month"]["stem"]],.50),(STEM_ELEMENT[ctx["year"]["stem"]],.20),(STEM_ELEMENT[ctx["day"]["stem"]],.30)]
    base=sum(w*sum(element_affinity(e,ref) for e in elements)/len(elements) for ref,w in refs)
    rel=sum(r["weight"]*r["value"] for r in context_relations(ctx))
    return max(0.0,min(1.0,(base+1)/2 * .75 + (rel+1)/2 * .25))
