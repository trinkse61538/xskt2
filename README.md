# XSKT2 — Universal Core + Personal Overlay

Domain: `xskt2.khaitringuyen.com`

Architecture:

```text
Universal Core (Thiên thời)
        ↓
Universal 00–99 Ranking
        ↓
Personal Overlay (Bát Tự)
        ↓
Personal 00–99 Ranking
```

Prediction is deterministic and isolated from lottery history. History/recent-form/station-match/anomaly layers are evaluation/research only and must not modify frozen picks.

## Local build

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
python scripts/build_universal_calendar.py --start 2026-01-01 --end 2050-12-31 --compact
python scripts/build_web_data.py
python -m http.server 8080
```

Open `http://localhost:8080`.

## Historical data

To import the legacy XSMN history from the old `xskt` repository:

```bash
bash scripts/import_legacy_history.sh
python scripts/rebuild_stats.py
```

## Version freeze

- Universal Core V1.0
- Personal Overlay V1.0
- Crawler V2
- Stats V1

See `/docs` for methodology and frozen conventions.

> Scores are ranking/coherence scores, **not probabilities of winning**.
