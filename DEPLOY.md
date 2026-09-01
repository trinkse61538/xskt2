# Deploy XSKT2 Web V1.1

## Apply patch vào repo hiện tại

```bash
cd ~/Desktop/xskt2
git pull --rebase origin main
git status

git apply --check ~/Downloads/xskt2-web-v1.1.patch
git apply ~/Downloads/xskt2-web-v1.1.patch

source .venv/bin/activate 2>/dev/null || true
python -m pip install -r requirements.txt
python -m pytest -q

git add .
git commit -m "feat: complete XSKT2 web app v1.1"
git push origin main
```

## Bootstrap history một lần

Nếu tab Thống kê/Đối chiếu báo chưa có history:

```bash
cd ~/Desktop/xskt2
source .venv/bin/activate
bash scripts/import_legacy_history.sh

git add data/history/
git commit -m "data: bootstrap XSMN history for XSKT2"
git push origin main
```

## GitHub Pages

Settings → Pages → Deploy from branch → `main` / `(root)`.

`CNAME` đã là `xskt2.khaitringuyen.com`.
