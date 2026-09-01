# Deterministic project-level Hà Đồ/Lạc Thư resonance. It is a ranking module, not a probability model.
LOSHU_POS={4:(0,0),9:(1,0),2:(2,0),3:(0,1),5:(1,1),7:(2,1),8:(0,2),1:(1,2),6:(2,2)}

def score_number(num,jdn_value):
    root=(jdn_value%9)+1
    rx,ry=LOSHU_POS[root]
    vals=[]
    for ch in num:
        d=int(ch); key=5 if d==0 else d
        x,y=LOSHU_POS[key]
        dist=abs(x-rx)+abs(y-ry)
        vals.append(1.0-dist/4.0)
    pair_bonus=.10 if (int(num[0])+int(num[1]))%9 in (root%9,0) else 0
    return max(0,min(1,sum(vals)/2+pair_bonus))
