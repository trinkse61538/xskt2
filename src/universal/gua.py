from .constants import TRIGRAMS, GENERATES, CONTROLS
from .calendar import year_pillar, hour_branch_index

def wrap8(n):
    r=n%8
    return 8 if r==0 else r

def element_affinity(candidate,reference):
    if candidate==reference:return 1.0
    if GENERATES[reference]==candidate:return .8
    if GENERATES[candidate]==reference:return .6
    if CONTROLS[reference]==candidate:return .15
    if CONTROLS[candidate]==reference:return .30
    return .5

def build_gua(d,hour=12,minute=0):
    yb=year_pillar(d)["branch"]+1
    m=d.month; day=d.day; hb=hour_branch_index(hour)+1
    upper=wrap8(yb+m+day)
    lower=wrap8(yb+m+day+hb)
    moving=(yb+m+day+hb)%6 or 6
    ub=TRIGRAMS[upper]["bits"]; lb=TRIGRAMS[lower]["bits"]
    bits=list(lb+ub)  # bottom → top within the project representation
    bits[moving-1]="1" if bits[moving-1]=="0" else "0"
    changed="".join(bits)
    body=upper if moving<=3 else lower
    use=lower if moving<=3 else upper
    return {"upper":TRIGRAMS[upper],"lower":TRIGRAMS[lower],"moving_line":moving,"body":TRIGRAMS[body],"use":TRIGRAMS[use],"hex_bits":lb+ub,"changed_bits":changed,"anchor":f"{hour:02d}:{minute:02d}"}

def number_score(elements,gua):
    body=gua["body"]["element"]; use=gua["use"]["element"]
    return sum(.60*element_affinity(e,body)+.40*element_affinity(e,use) for e in elements)/len(elements)
