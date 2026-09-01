#!/usr/bin/env python3
import argparse,json,sys
from datetime import date,timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.universal.engine import build_day,assign_month_ranks

def parse(s):return date.fromisoformat(s)
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--start",default="2026-01-01");ap.add_argument("--end",default="2050-12-31");ap.add_argument("--compact",action="store_true");a=ap.parse_args()
    start,end=parse(a.start),parse(a.end); byyear={};d=start
    while d<=end:
        print("build",d,end="\r");byyear.setdefault(d.year,[]).append(build_day(d));d+=timedelta(days=1)
    all_records=[r for y in byyear.values() for r in y];assign_month_ranks(all_records)
    out=ROOT/"data/universal";out.mkdir(parents=True,exist_ok=True)
    for y,rows in byyear.items():
        p=out/f"universal-{y}.json";p.write_text(json.dumps(rows,ensure_ascii=False,separators=(",",":") if a.compact else None),encoding="utf-8");print("\nwrote",p,len(rows))
if __name__=="__main__":main()
