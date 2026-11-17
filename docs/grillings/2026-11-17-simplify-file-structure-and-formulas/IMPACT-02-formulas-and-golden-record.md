# Impact 2 - formulas, golden fixtures and the spreadsheet

## Impact

- `docs/reference/sheet-formulas.md` is the new reference: occupant ratios everywhere, the collection subscription inside the water treatment shares, the heat pump split over the months. No figure code exists yet, so only the fixtures must follow.
- `tests/fixtures/golden-period.json` and `golden-expected.json` are in the v1 shape and have no collection subscription keys. They come from `scripts/extract-golden.py` and `scripts/randomize-golden.py`, which read `Suivi des charges de location (v2).xlsx`.
- Correction to my first draft: the workbook already includes the collection subscription (rows 42 and 43 of `Période-092025-092026`, 1.0208 and 0.735 in every month, used in the water treatment landlord and tenant formulas). Only the v1 docs, the v1 period file and the extraction script left it out. The workbook and its cached values do not change.

## Judgment calls to review

- The golden record is regenerated from a corrected workbook, not edited by hand. The workbook is yours, so I will not edit it. `golden-randomized.xlsx` must be redone too.
  - Approved
- The values 1.2 and 0.8 in `docs/examples/2026-2027.json` are invented samples and must not reach the golden record.
  - I fixed them

## Path to done

1. Update `extract-golden.py` to read rows 42 and 43 and emit the v2 shape (start and end dates, both indexes per month, the new keys, no `settings`).
2. Regenerate the two fixtures and the randomized workbook, then run the golden specs.
3. Add a hand-written spec for the heat pump split: 154 gives 12.83 for eleven months and 12.87 for the twelfth.

> Point 1 is withdrawn: no workbook change is needed.

### Q1 - what is `collection subscription`? A Glossary entry be needed.

The collection subscription (_Abonnement collecte_) is the fixed monthly part of the water treatment bill. The workbook holds it in two rows of `Période-092025-092026`: row 42 `Abonnement collecte (part distributeur)` and row 43 `Abonnement collecte (part communautraire)`. The formulas of rows 48 and 49 add `SUM(B42:B43)` times the landlord or tenant occupant ratio to the consumption part (`docs/reference/sheet-formulas.md`, "Water treatment formula"). Property names in the period file: `waterTreatment.monthlySubscriptionDistributor` and `waterTreatment.monthlySubscriptionCommunity` (`docs/period-file.md`). A glossary entry is added: `GLOSSARY.md`, "Collection subscription".

## Needed from you

Check the answer to Q1 and the new glossary entry. Nothing else: you do not need to touch the workbook.
