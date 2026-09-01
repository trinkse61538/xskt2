#!/usr/bin/env python3
import json,sys
from datetime import date
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.stats import score_picks

def main():
    out=[]
    for hp in sorted((ROOT/"data/history/raw").glob("*.json")):
        day=json.loads(hp.read_text(encoding="utf-8")); y=day["date"][:4]; up=ROOT/f"data/universal/universal-{y}.json"
        if not up.exists():continue
        uni=next((x for x in json.loads(up.read_text(encoding="utf-8")) if x["date"]==day["date"]),None)
        if not uni:continue
        draws=day["draws"]; first=draws[:1]
        picks=[uni["universal"]["primary"],uni["universal"]["secondary"]]
        out.append({"date":day["date"],"universal":{"picks":picks,"station_1":score_picks(picks,first),"any_station":score_picks(picks,draws)}})
    p=ROOT/"data/history/derived/scored-results.json";p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":")),encoding="utf-8");print("wrote",p,len(out))
if __name__=="__main__":main()
