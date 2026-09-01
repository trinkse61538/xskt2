# XSKT2 — Universal Core + Personal Overlay

Domain: `https://xskt2.khaitringuyen.com`  
Repo: `trinkse61538/xskt2`

XSKT2 tách prediction core khỏi history:

```text
Universal Core → Universal 00–99 Ranking → Personal Overlay → Personal Ranking

Core Prediction → Station Match → Recent Form → Anomaly Watch
```

History/research không được sửa Chủ 1/Chủ 2 đã freeze.

## Web V1.1

5 tab chính đã hoàn thiện:

- **Hôm nay** — Universal/Personal, Chủ 1/2, Top 5/10, Day Score, Agreement, Tier, result strip và Station Match summary.
- **Ngày tốt** — 4/7/10/15/20/25 ngày; start-date là mốc sớm nhất; chọn theo quality trước rồi sort lại theo ngày.
- **Hướng dẫn** — stop-on-win 4/7/10/15/20/25 ngày, bước 15k/số, payout giả định 15k→80k/nháy.
- **Thống kê** — Universal vs Personal vs theoretical random baseline; 7/30/90/365 ngày, tháng, tất cả; Đài 1/Any Station; WIN/MISS và nháy.
- **Thêm** — Hồ sơ Personal, Lịch tháng, Đối chiếu đài/Recent Form/Anomaly, Tất cả ngày, Phương pháp và trạng thái dữ liệu.

## Setup local

```bash
cd ~/Desktop/xskt2
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pytest -q
```

Expected: `11 passed`.

Có thể chạy gộp frontend syntax + Python tests:

```bash
bash scripts/check_web.sh
```

## Bootstrap history từ repo xskt cũ

Chạy một lần nếu `data/history/raw/` chưa có lịch sử:

```bash
bash scripts/import_legacy_history.sh
```

Script tự:

1. clone `trinkse61538/xskt`,
2. migrate CSV sang canonical daily JSON,
3. giữ đủ 18 tails và duplicate,
4. build `recent-stats.json`, `history-index.json`,
5. score các ngày đã có Universal data.

Sau đó commit `data/history/raw/` và `data/history/derived/`.

## Daily crawler

GitHub Actions chạy khoảng 16:50 và retry 17:10 Asia/Ho_Chi_Minh. Draw chỉ append nếu toàn bộ station trong ngày đủ 18 kết quả.

## Generate calendar

Full package đã có Universal 2026–2050. Khi cần rebuild:

```bash
python scripts/build_universal_calendar.py --start 2026-01-01 --end 2050-12-31 --compact
python scripts/build_web_data.py
```

## Integrity

- Score/Agreement/Tier **không phải xác suất**.
- Personal V1 = 80% Universal + 20% Personal Overlay, rerank Universal Top 20.
- Money-management không đi vào scoring engine.
- `test_no_future_leakage.py` đảm bảo append history không thay prediction core.
