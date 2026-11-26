from datetime import date
from src.history.integrity import EXPECTED,SCHEDULE,atomic_json,validate_day
from src.history.v3 import *
import pytest,json
from scripts.report_v3 import paired_p
D='2026-11-25'
def fixture(d=D):
    return {'date':d,'draws':[draw(d,s,{k:['0'*l]*n for k,(n,l) in EXPECTED.items()},{}) for s in SCHEDULE[date.fromisoformat(d).weekday()]]}
def test_legacy_not_promoted(tmp_path):
    d=fixture('2005-10-01');d['draws'][0]['results'][-1]['value']='00000';p=tmp_path/'raw'/'2005-10-01.json';atomic_json(p,d)
    assert legacy_tail_day(d)==d
    with pytest.raises(ValueError):read_day(p)
    assert json.loads(p.read_text())==d

def test_recovery_evidence_and_tamper(tmp_path):
    d=fixture('2005-10-01');raw=json.loads(json.dumps(d));raw['draws'][0]['results'][-1]['value']='00000';p=tmp_path/'raw'/'2005-10-01.json';atomic_json(p,raw)
    a={'day':d,'source':{'url':'https://xoso.com.vn/a','sha256':'a'*64}};b={'day':d,'source':{'url':'https://www.minhngoc.net.vn/b','sha256':'b'*64}}
    atomic_json(verified_path(p),evidence_record(p,a,b));assert signature(read_day(p))==signature(d);assert json.loads(p.read_text())==raw
    raw['draws'][0]['source']={'modified':True};atomic_json(p,raw)
    with pytest.raises(ValueError):read_day(p)

def test_parser_named_columns():
    names=list(reversed(SCHEDULE[2]));header='<tr><th>G</th>'+''.join('<th>'+x+'</th>' for x in names)+'</tr>'
    labels=['8','7','6','5','4','3','2','1','ĐB'];rows=''
    for label,(k,(n,l)) in zip(labels,EXPECTED.items()):
        rows+='<tr><td>'+label+'</td>'+''.join('<td>'+' '.join([str(i)*l]*n)+'</td>' for i in range(1,4))+'</tr>'
    html='<h1>25/11/2026</h1><table>'+header+rows+'</table>'
    v=parse_xoso(html,D,{})
    assert v['draws'][0]['station']=='Đồng Nai' and v['draws'][0]['tails'][0]=='33'
    with pytest.raises(ValueError):parse_xoso(html,'2026-11-24',{})

def test_minhngoc_nested_table():
    cols=''
    for i,s in enumerate(SCHEDULE[2],1):
        rows=f'<tr><td><a>{s}</a></td></tr><tr><td>XS - K</td></tr>'+''.join('<tr><td>'+' '.join([str(i)*l]*n)+'</td></tr>' for k,(n,l) in EXPECTED.items())
        cols+='<td><table>'+rows+'</table></td>'
    html='<table><tr><td>25/11/2026</td></tr><tr>'+cols+'</tr></table>'
    v=parse_minhngoc(html,D,{});assert v['draws'][0]['tails'][0]=='11'

def test_paired():
    assert paired_p(0,0)==1 and paired_p(4,0)==.125 and paired_p(2,2)==1
