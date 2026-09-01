#!/usr/bin/env python3
import json,math,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.stats import theoretical_baseline

def ci95(h,n):
    if not n:return [0,0]
    p=h/n; z=1.96; den=1+z*z/n; center=(p+z*z/(2*n))/den; half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return [max(0,center-half),min(1,center+half)]
def main():
    p=ROOT/"data/history/derived/scored-results.json"
    if not p.exists():raise SystemExit("Run score_results.py first")
    rows=json.loads(p.read_text(encoding="utf-8")); base=theoretical_baseline(2,18); report={}
    for name,start,end in [("development","2005-01-01","2018-12-31"),("validation","2019-01-01","2022-12-31"),("holdout","2023-01-01","2025-12-31"),("forward","2026-01-01","9999-12-31")]:
        g=[r for r in rows if start<=r["date"]<=end];h=sum(r["universal"]["station_1"]["win"] for r in g);n=len(g);rate=h/n if n else None
        report[name]={"n":n,"hits":h,"hit_rate":rate,"baseline":base,"delta_vs_baseline":None if rate is None else rate-base,"ci95":ci95(h,n) if n else None}
    o=ROOT/"data/backtest/backtest-summary.json";o.parent.mkdir(parents=True,exist_ok=True);o.write_text(json.dumps(report,indent=2),encoding="utf-8");print(json.dumps(report,indent=2))
if __name__=="__main__":main()
