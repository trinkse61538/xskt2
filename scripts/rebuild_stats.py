#!/usr/bin/env python3
import json,sys
from pathlib import Path
from collections import Counter,defaultdict
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.stats import theoretical_baseline
RAW=ROOT/"data/history/raw";OUT=ROOT/"data/history/derived";OUT.mkdir(parents=True,exist_ok=True)

def main():
    stations=defaultdict(lambda:{"draws":0,"tail_counts":Counter(),"recent":[]})
    latest=None
    for p in sorted(RAW.glob("*.json")):
        obj=json.loads(p.read_text(encoding="utf-8"));latest=obj["date"]
        for d in obj["draws"]:
            st=stations[d["station"]];st["draws"]+=1;st["tail_counts"].update(d["tails"]);st["recent"].append({"date":obj["date"],"tails":d["tails"],"unique_hits":sorted(set(d["tails"]))})
    payload={"updatedThrough":latest,"baseline_two_picks_18":theoretical_baseline(2,18),"stations":{k:{"draws":v["draws"],"tail_counts":dict(v["tail_counts"]),"recent":v["recent"][-100:]} for k,v in stations.items()},"note":"Empirical history is evaluation/research only; duplicate tails are preserved."}
    (OUT/"recent-stats.json").write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8");print("Built stats through",latest)
if __name__=="__main__":main()
