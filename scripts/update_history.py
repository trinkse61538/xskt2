#!/usr/bin/env python3
import argparse,json,sys
from datetime import datetime,date,timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from src.history.integrity import atomic_json,validate_day,days
from src.history.crawler import fetch_day,NoDraw,http_session
RAW=ROOT/'data/history/raw';FAIL=ROOT/'data/history/failures'
def target_date(now):return now.date() if (now.hour,now.minute)>=(17,10) else now.date()-timedelta(days=1)
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--start',default='2026-01-01');ap.add_argument('--end');ap.add_argument('--limit',type=int,default=60);ap.add_argument('--retry-no-draw',action='store_true');a=ap.parse_args()
    now=datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')); target=target_date(now);end=min(target,date.fromisoformat(a.end)) if a.end else target
    RAW.mkdir(parents=True,exist_ok=True);FAIL.mkdir(parents=True,exist_ok=True); session=http_session(); pending=[];errors=[]
    for d in days(date.fromisoformat(a.start),end):
        k=d.isoformat(); p=RAW/f'{k}.json';nd=FAIL/f'{k}-nodraw.json'
        if p.exists():continue # existing raw must never be overwritten
        if nd.exists() and not a.retry_no_draw:continue
        pending.append(d)
    # Newest day first, then oldest gaps so an old failure cannot block today's result.
    order=([pending[-1]]+pending[:-1]) if pending else []
    for d in order[:max(0,a.limit)]:
        k=d.isoformat();p=RAW/f'{k}.json';err=FAIL/f'{k}-failure.json';nd=FAIL/f'{k}-nodraw.json'
        try:
            obj=validate_day({'date':k,'draws':fetch_day(d,session)});atomic_json(p,obj);err.unlink(missing_ok=True);nd.unlink(missing_ok=True);print('Saved',k,len(obj['draws']))
        except NoDraw as e:
            # Source text alone is not independent evidence; keep retryable status.
            atomic_json(err,{'date':k,'status':'NO_DRAW_UNVERIFIED','error':str(e)});errors.append(k)
        except Exception as e:
            atomic_json(err,{'date':k,'status':'NO_UPDATE','error':str(e)});errors.append(k);print('Failed',k,e)
    print('Target',target,'missing before run',len(pending),'failed',len(errors),'not attempted',max(0,len(pending)-a.limit))
    return 1 if errors or len(pending)>a.limit else 0
if __name__=='__main__':raise SystemExit(main())
