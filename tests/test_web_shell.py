from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def test_five_primary_screens_are_real():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    for name in ('today','best','guide','stats','more'):
        assert f'id="screen-{name}"' in html
        assert f'data-screen="{name}"' in html
    assert 'data-scroll=' not in html

def test_frontend_modules_exist():
    for name in ('app.js','data.js','personal.js','history.js','guide.js','screens.js','style.css'):
        assert (ROOT/'assets'/name).is_file()
