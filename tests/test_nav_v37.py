from pathlib import Path
from html.parser import HTMLParser
import json,re
ROOT=Path(__file__).resolve().parents[1]
class Nav(HTMLParser):
    def __init__(self):
        super().__init__();self.in_nav=False;self.order=[];self.ids=[];self.more=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='nav' and 'bottom-nav' in a.get('class','').split():self.in_nav=True
        if self.in_nav and tag=='button':self.order.append(a.get('data-screen'))
        if 'data-more' in a:self.more.append(a['data-more'])
    def handle_endtag(self,tag):
        if tag=='nav':self.in_nav=False

def test_menu_order_and_unique_sections():
    h=Nav();h.feed((ROOT/'index.html').read_text(encoding='utf-8'))
    assert h.order==['today','best','guide','all','more']
    assert h.ids.count('screen-all')==h.ids.count('more-stats')==1
    assert 'screen-stats' not in h.ids and 'more-all' not in h.ids
    assert 'stats' in h.more and 'all' not in h.more

def test_stats_controls_preserved_and_nested():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    sub=html.split('id="more-stats"',1)[1].split('</section>',1)[0]
    for ident in ['statsWindow','statsScopeChoice','statsFreshness','statsKpis','statsBaseline','statsFilter','statsDays']:
        assert html.count(f'id="{ident}"')==1 and f'id="{ident}"' in sub
    assert 'back-more' in sub
    all_section=html.split('id="screen-all"',1)[1].split('</section>',1)[0]
    for ident in ['allYear','allMonth','allTier','allSearch','allSummary','allDays']:
        assert html.count(f'id="{ident}"')==1 and f'id="{ident}"' in all_section
    assert 'back-more' not in all_section

def test_routes_and_legacy_aliases():
    app=(ROOT/'assets/app.js').read_text(encoding='utf-8')
    for route in ["if(name==='stats')return openMore('stats')", "if(name==='all')return setScreen('all')", "if(name==='stats')return renderStats(ctx)", "else if(state.screen==='all')await renderAll(ctx)", "state.moreSub==='stats'"]:
        assert route in app
    assert "if(e.target.closest('.back-more')){showMoreMenu();return;}" in app

def test_version_and_cache():
    assert json.loads((ROOT/'package.json').read_text())['version']=='3.7.0'
    html=(ROOT/'index.html').read_text();sw=(ROOT/'sw.js').read_text()
    for x in ['./assets/app.js?v=3.7.0','./assets/style.css?v=3.7.0']:
        assert x in html and x in sw
    assert 'xskt2-v3.7.0' in sw
