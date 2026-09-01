# MIGRATION FROM `xskt`

Keep the old `xskt` repository read-only as V5.1 Personal reference.

Port/refactor:
- XSMN station schedule
- fetch/retry concept
- 18-result validation
- source checksum
- historical CSV
- recent form / station match / anomaly concepts
- PWA and money-management UX concepts

Rewrite:
- prediction core
- personal ranking
- monolithic versioned frontend assets
- legacy hard-coded status/ranking logic

Important correction: legacy derived recent-form data de-duplicated tails using a set. XSKT2 canonical history and nháy stats keep duplicate tails.
