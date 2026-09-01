# Deploy XSKT2 to GitHub

## Fresh clone / first deployment

```bash
cd ~/Desktop
git clone https://github.com/trinkse61538/xskt2.git XSKT2
cd XSKT2

# Copy the full package into the empty repo (adjust Downloads path to the extracted package)
rsync -av --exclude='.git' ~/Downloads/xskt2-full-package/ ./

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
python scripts/build_universal_calendar.py --start 2026-01-01 --end 2050-12-31 --compact
python scripts/build_web_data.py

git add .
git commit -m "feat: bootstrap XSKT2 Universal V1 and Personal Overlay V1"
git push origin main
```

## Later pull → edit → push

```bash
cd ~/Desktop/XSKT2
git pull --rebase origin main
# make/copy changes
git add .
git commit -m "update XSKT2"
git push origin main
```

## DNS / GitHub Pages

Repository Settings → Pages → Deploy from branch → `main` / `(root)`.

DNS:

```text
Type: CNAME
Name: xskt2
Target: trinkse61538.github.io
```

The repository already contains `CNAME` with `xskt2.khaitringuyen.com`.
