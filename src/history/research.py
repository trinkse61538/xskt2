"""Global snapshot descriptive tests; no use in Universal scoring."""
import math
from collections import Counter
WINDOWS=(30,100,300)
def bh(tests):
    ordered=sorted(tests,key=lambda t:t['p']);q=1.
    for i in range(len(ordered)-1,-1,-1):
        q=min(q,ordered[i]['p']*len(ordered)/(i+1));ordered[i]['q']=q
    return tests
def test(z):return {'z':z,'p':math.erfc(abs(z)/math.sqrt(2))}
def snapshot(stations):
    number_tests=[];station_tests=[];payload={}
    for name,full in stations.items():
        rows=full[-300:];counts={w:Counter(x for r in rows[-w:] for x in r['tails']) for w in WINDOWS if len(rows)>=w};nums={}
        past=Counter(x for r in rows[:-30] for x in r['tails']) if len(rows)>=300 else None
        for i in range(100):
            num=f'{i:02d}';v={}
            for w,c in counts.items():
                n=w*18;z=(c[num]-.01*n)/math.sqrt(n*.01*.99);t=test(z);v[str(w)]=t;number_tests.append(t)
            if past is not None:
                n,m=540,4860;x,y=counts[30][num],past[num];p=(x+y)/(n+m);z=(x/n-y/m)/math.sqrt(p*(1-p)*(1/n+1/m)) if 0<p<1 else 0.;t=test(z);v['drift']=t;number_tests.append(t)
            nums[num]=v
        entry={'numbers':nums};payload[name]=entry
        if 300 in counts:
            c=counts[300];e=54;chi=sum((c[f'{i:02d}']-e)**2/e for i in range(100));z=((chi/99)**(1/3)-(1-2/(9*99)))/math.sqrt(2/(9*99));t={'chi':chi,'p':math.erfc(z/math.sqrt(2))/2};entry['station']=t;station_tests.append(t)
    bh(number_tests);bh(station_tests)
    return {'stations':payload,'numberTests':len(number_tests),'confirmedNumberTests':sum(t['q']<=.05 for t in number_tests),'stationTests':len(station_tests),'confirmedStationTests':sum(t['q']<=.05 for t in station_tests),'note':'Latest snapshot, approximate normal/chi-square tests and global BH across all eligible stations; descriptive, correlated tests.'}
