# Grilling round v04 — v1 test scope (issue #6)

## Settled in v03

- Q19: meter deltas and softener purchases are multiplied by a seeded random factor between 0.85 and 1.15; indexes are rebuilt from the first previous index and rounded to whole litres or kWh; softener amounts keep two decimals.
- Q20: unit prices and fees, reading dates, occupant counts, tariff modes, the monthly tenant bill advance and the advances received keep their real values.
- Q21: the heat pump maintenance is set to 169 only in the months that already have one; the other months stay empty.
- Q22: both Python scripts (randomize, extract) are committed under `scripts/`.
- Q22b: each script declares `openpyxl` in a PEP 723 header and runs with `uv run`.
- Q23: `docs/architecture.md` gets one line pointing to `docs/architecture-tests.md`.

## Q24 - Does the summary match your understanding

`GRILLING-SUMMARY.md` in this folder restates the decisions, lists them in an index, flags what I decided without asking (script names, how the two Vitest environments coexist, how the coverage table reaches the job summary, no glossary change) and holds a paste-ready comment for issue #6.

Does it match your understanding? Corrections go straight into `GRILLING-SUMMARY.md` or under this answer.

➡️ Recommendation: yes, once you have checked the "Not grilled, decided by default" section.

### Answer to Q24

Yes
