# XSKT2 Web V2.0.0 — Data & Research Integrity

Universal V1.0 remains unchanged; all published calendar artifacts are preserved. Personal V1.1 corrects the frontend to match the existing Python date/noon mean-solar-term conventions (not astronomical birth-time ephemerides). Existing profile data remains in local storage; computed Personal rankings may change. Historic Personal comparisons are retrospective.

- Crawler targets last completed draw even when scheduled late, scans gaps from 2026-01-01 and never overwrites existing raw records. Source order still assumes the configured station order; verify against independent results if source format changes.
- Raw validation requires correct per-prize lengths/counts, duplicate-tail preservation, and station-set completeness from 2026. Old station names and schedule changes are not inferred. Rejected records stay untouched; health lists them.
- Legacy CSV import is non-destructive; conflicts logged, no automatic overwrite. Old NO_DRAW markers are not independently verified.
- Health manifest + year and station shards, revision consistency checks; legacy indexes retained for compatibility, new client uses shards. Cache is browser Cache Storage, not IndexedDB. Offline only works for previously fetched shards. Research loads only selected stations and filters strictly before selected date.
- Anomaly uses tail frequency, approximate normal tests, 30/100/300 windows, drift and BH-FDR across loaded stations for as-of views; latest global snapshot spans all eligible stations, separate station chi-square correction. Correlation, sparse counts and selection affect interpretation; descriptive only. Recent Form measures draw-level hit rate separately.
- Backtest evaluates historical dates with frozen Universal algorithm; no claim of untouched holdout or predictive advantage. Wilson CI is approximate. Optional V5.1 source enables matched-day comparison; no profile information exported. Daily ledger cannot prove prior predictions unless commit timestamp is independently verified. Existing guide remains a hypothetical legacy simulation, not part of research scoring.
- New PWA icons, cache version, data health and research view, Vietnamese timezone, calendar-day statistics windows, retryable fetch errors. No external analytics or paid APIs.

## Commands

```bash
python scripts/import_verified_history.py /path/to/xskt/data/history/xsmn_history.csv
python scripts/update_history.py
python scripts/rebuild_stats.py
python scripts/score_results.py
python scripts/backtest.py --legacy-js /path/to/xskt/data/v51-2026-2050.v41.js
bash scripts/check_web.sh
```

If legacy JS cannot be parsed as JSON, run `python scripts/backtest.py` (Universal vs theoretical baseline only); no eval of external JS. For full historical 2005–2025 calendar output, do not regenerate 2026–2050 files. Backtest generates historical records in memory instead.
