# UNIVERSAL V1.0 SPEC — FROZEN CONVENTIONS

Universal V1 uses only information belonging to the date itself. It does **not** use birth data, profile data, XSMN history, recent form, station hit rate, WIN/MISS, or future results.

## Digit ↔ element
- Water/Thủy: 1, 6
- Fire/Hỏa: 2, 7
- Wood/Mộc: 3, 8
- Metal/Kim: 4, 9
- Earth/Thổ: 0, 5

## Module weights
- Seasonal Qi: 30%
- Can Chi relations: 20%
- 12 Trực + Nạp âm: 15%
- Kinh Dịch day gua: 25%
- Hà Đồ / Lạc Thư resonance: 10%

## Seasonal states
`Vượng=1.00, Tướng=0.80, Hưu=0.45, Tù=0.25, Tử=0.10`.

## Calendar convention
Timezone is `Asia/Ho_Chi_Minh`. Solar terms use a deterministic 1900–2100 mean-solar-term algorithm. The Bát Tự month boundary uses the 12 Jie terms starting at Lập Xuân.

## Day Gua convention
V1 uses a fixed noon anchor (12:00 local) so reopening the site at another time cannot alter a day's prediction. Event-Time Gua at 16:15 is generated separately as research-only and is excluded from Universal V1 score.

## Tie break
1. raw score descending
2. module agreement descending
3. numeric value ascending

## Day score
Day Score measures signal clarity/coherence, not chance of winning.

## Integrity
Appending history must never change Universal picks for a date.
