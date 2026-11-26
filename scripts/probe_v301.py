#!/usr/bin/env python3
"""Read-only live source smoke check. No raw or verification files written."""
import argparse,json,sys
from pathlib import Path
from datetime import date,datetime,timedelta
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.crawler import http_session
from src.history.v3 import fetch_pair,signature,read_day

def main():
    now=datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'));last=now.date() if (now.hour,now.minute)>=(17,10) else now.date()-timedelta(days=1)
    a=argparse.ArgumentParser();a.add_argument('--date',type=date.fromisoformat,default=last);a=a.parse_args()
    if a.date>last:raise SystemExit('Refusing to probe an incomplete/future day')
    first,second=fetch_pair(a.date,http_session());print('Two-source agreement:',a.date, [r['station'] for r in first['day']['draws']]);print('Source URLs:',first['source']['url'],second['source']['url'])
    raw=ROOT/f'data/history/raw/{a.date.isoformat()}.json'
    if raw.exists():
        try:existing=read_day(raw)
        except ValueError:print('Existing raw is unverified; use recovery workflow for evidence.');return
        if signature(existing)!=signature(first['day']):raise SystemExit('Existing validated data conflicts with live sources; raw untouched')
        print('Existing raw agrees with sources')
    else:print('No raw yet; probe did not write data')
if __name__=='__main__':main()
