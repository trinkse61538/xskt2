import json,shutil,subprocess
from datetime import date
from pathlib import Path
import pytest
from src.personal.bazi import pillars
ROOT=Path(__file__).resolve().parents[1]
@pytest.mark.skipif(not shutil.which('node'),reason='Node required for JS parity')
def test_js_python_bazi_parity():
    cases=[['1995-01-01','12:00'],['1995-02-03','23:30'],['1995-02-04','00:10'],['1995-02-05','12:00'],['1995-02-27','20:40'],['2000-03-05','01:00'],['2026-09-01','12:00'],['2028-02-29','23:59']]
    code="import {baziIndices} from './assets/bazi-calendar-v2.js'; console.log(JSON.stringify("+json.dumps(cases)+".map(x=>baziIndices(...x))));"
    arr=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
    for (d,t),actual in zip(cases,arr):
        h,m=map(int,t.split(':'));p=pillars(date.fromisoformat(d),h,m);expected=[[p[k]['stem'],p[k]['branch'],w] for k,w in [('year',1),('month',2),('day',2),('hour',1)]];assert actual==expected,(d,t,actual,expected)
