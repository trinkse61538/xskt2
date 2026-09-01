#!/usr/bin/env python3
import json,sys
from datetime import datetime,timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.crawler import fetch_day,NoDraw,http_session

RAW=ROOT/"data/history/raw"; RAW.mkdir(parents=True,exist_ok=True)
FAIL=ROOT/"data/history/failures";FAIL.mkdir(parents=True,exist_ok=True)

def existing_dates():
    return {p.stem for p in RAW.glob("*.json")}

def main():
    now=datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")); target=now.date()
    # Actions are scheduled after the draw; manual early runs should no-op instead of creating MISS.
    if (now.hour,now.minute)<(16,45): print("Too early for today's XSMN; no update");return
    key=target.isoformat(); p=RAW/f"{key}.json"
    if p.exists(): print("Already have",key);return
    try:
        rows=fetch_day(target,http_session())
        # Whole day is atomic: all scheduled stations must be present and complete.
        if not rows or any(x.get("result_count")!=18 for x in rows):raise ValueError("Incomplete day")
        p.write_text(json.dumps({"date":key,"draws":rows},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
        print("Saved",p,len(rows),"stations")
    except NoDraw as e:
        (FAIL/f"{key}-nodraw.json").write_text(json.dumps({"date":key,"status":"NO_DRAW","reason":str(e)},ensure_ascii=False),encoding="utf-8");print("NO_DRAW",e)
    except Exception as e:
        (FAIL/f"{key}-failure.json").write_text(json.dumps({"date":key,"status":"NO_UPDATE","error":repr(e)},ensure_ascii=False),encoding="utf-8")
        raise SystemExit(f"No update; retry later: {e}")
if __name__=="__main__":main()
