#!/usr/bin/env python3
import argparse,json
from datetime import date
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--start",required=True);ap.add_argument("--count",type=int,choices=[4,7,10,15,20,25],required=True);a=ap.parse_args();start=date.fromisoformat(a.start)
    rows=[]
    for y in range(start.year,2051):
        p=ROOT/f"data/universal/universal-{y}.json"
        if p.exists():rows+=json.loads(p.read_text(encoding="utf-8"))
    elig=[r for r in rows if r["date"]>=start.isoformat()];chosen=sorted(elig,key=lambda r:(-r["universal"]["day_score"],-r["universal"]["agreement"],r["date"]))[:a.count]
    print(json.dumps([{k:r["universal"][k] for k in ("day_score","agreement","tier","primary","secondary")}|{"date":r["date"]} for r in sorted(chosen,key=lambda r:r["date"])],ensure_ascii=False,indent=2))
if __name__=="__main__":main()
