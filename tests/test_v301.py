import copy,json
from datetime import date
import pytest
from src.history.integrity import EXPECTED,SCHEDULE,atomic_json
from src.history.v3 import (parse_xoso,parse_minhngoc,signature,read_day,draw,evidence_record,verified_path,validate_source_day)

D='2026-11-25'; OLD='2005-10-01'
def html_table(d,old=False,reverse=False,changed=False):
    names=SCHEDULE[date.fromisoformat(d).weekday()]; keys=list(EXPECTED);keys=keys[::-1] if reverse else keys
    head='<tr><th>G</th>'+''.join(f'<th>{s}</th>' for s in names)+'</tr>'
    rows=[]
    for k in keys:
        n,l=EXPECTED[k];l=5 if old and k=='giai_db' else l
        label={'giai_db':'Giải đặc biệt'}.get(k,'Giải '+k[-1])
        rows.append(f'<tr><td>{label}</td>'+''.join('<td>'+' '.join([str(i+int(changed and i==1))*l]*n)+'</td>' for i in range(1,len(names)+1))+'</tr>')
    return '<table>'+head+''.join(rows)+'</table>'

def test_historical_db_five_and_no_padding(tmp_path):
    h='<h2>XSMN 1/10/2005</h2>'+html_table(OLD,old=True)
    a=parse_xoso(h,OLD,{'url':'https://xoso.com.vn/a'});assert len(a['draws'][0]['results'][-1]['value'])==5
    b=parse_minhngoc('<table><tr><td>01/10/2005</td></tr><tr><td>'+html_table(OLD,old=True,reverse=True)+'</td></tr></table>',OLD,{})
    assert signature(a)==signature(b)
    p=tmp_path/'raw'/f'{OLD}.json';atomic_json(p,a)
    with pytest.raises(ValueError):read_day(p)
    atomic_json(verified_path(p),evidence_record(p,{'day':a,'source':{'url':'https://xoso.com.vn/a','sha256':'a'*64}},{'day':b,'source':{'url':'https://www.minhngoc.net.vn/b','sha256':'b'*64}}))
    assert signature(read_day(p))==signature(a);assert json.loads(p.read_text())==a

def test_current_rejects_5_digit_db():
    with pytest.raises(ValueError):parse_xoso('<h2>25/11/2026</h2>'+html_table(D,old=True),D,{})

def test_date_scoping_and_duplicate_same_table():
    t=html_table(D);h='<h2>25/11/2026</h2>'+t+t+'<h2>24/11/2026</h2>'+html_table(D,changed=True)
    assert len(parse_xoso(h,D,{})['draws'])==3
    with pytest.raises(ValueError):parse_xoso('<h2>25/11/2026</h2>'+t+html_table(D,changed=True),D,{})
    with pytest.raises(ValueError):parse_xoso('<h2>24/11/2026</h2>'+t,D,{})

def test_minhngoc_reversed_and_dated():
    t=html_table(D,reverse=True);html='<table><tr><td>25/11/2026</td></tr><tr><td>'+t+'</td></tr></table>'
    assert signature(parse_minhngoc(html,D,{}))==signature(parse_xoso('<h1>25/11/2026</h1>'+t,D,{}))
    with pytest.raises(ValueError):parse_minhngoc(html,'2026-11-24',{})

def test_no_silent_non_db_correction(tmp_path):
    a=parse_xoso('<h1>01/10/2005</h1>'+html_table(OLD,old=True),OLD,{})
    b=copy.deepcopy(a);p=b['draws'][0]['results'][2];p['value']='9'+p['value'][1:]
    raw=tmp_path/'raw'/f'{OLD}.json';atomic_json(raw,a)
    with pytest.raises(ValueError):evidence_record(raw,{'day':b,'source':{}},{'day':b,'source':{}})
