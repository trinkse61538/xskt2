from .constants import ELEMENTS, GENERATES, CONTROLS
from .calendar import solar_month_number

# Dần/Mão=Wood, Tỵ/Ngọ=Fire, Thân/Dậu=Metal, Hợi/Tý=Water; transition months Thìn/Mùi/Tuất/Sửu=Earth.
DOMINANT_BY_SOLAR_MONTH={1:"wood",2:"wood",3:"earth",4:"fire",5:"fire",6:"earth",7:"metal",8:"metal",9:"earth",10:"water",11:"water",12:"earth"}

def states_for_date(d):
    dominant=DOMINANT_BY_SOLAR_MONTH[solar_month_number(d)]
    generated=GENERATES[dominant]
    generator=next(e for e,v in GENERATES.items() if v==dominant)
    controller=next(e for e,v in CONTROLS.items() if v==dominant)
    controlled=CONTROLS[dominant]
    scores={e:.0 for e in ELEMENTS}; labels={}
    for e,val,label in [(dominant,1.0,"Vượng"),(generated,.8,"Tướng"),(generator,.45,"Hưu"),(controller,.25,"Tù"),(controlled,.10,"Tử")]:
        scores[e]=val; labels[e]=label
    return {"dominant":dominant,"scores":scores,"labels":labels}
