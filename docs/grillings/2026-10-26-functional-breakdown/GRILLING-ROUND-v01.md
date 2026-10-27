# Grilling round v01 — functional breakdown of the tenant bills app

## Settled in v00

Nothing yet: this is the first round. Facts I gathered from `Suivi des charges de location (v2).xlsx` before writing it:

- Each period sheet has **13 month columns** (B to N, e.g. 14/09/2026 to 14/09/2027) and a totals column O. The 13th month (September) is also the first month of the next period.
- Column O sums 12 advances (`O7 = SUM(B7:M7)`) but 13 months of tenant shares (`O25 = SUM(B25:N25)`, etc.).
- The "Régularisation-20252026" sheet also sums 13 months (Sept 2025 to Sept 2026) and has a manual line 11 "Réajustement charges 2025/2026 versus 2026/2027 pour septembre 2026" (-20 €).
- Only the **tenant** shares are summed in column O; the landlord shares are informational.
- Line 90 (PAC) is 154/12 per month in 2026-2027, but in 2025-2026 it was 154 € in one go in September, and the regularization charges the full 154 € to the tenant.
- Electricity switched from Base to HC/HP in the 2025-2026 sheet (column M), and the 2026-2027 sheet is back on Base only with HC/HP rows at 0.
- Line 72 "Nombre d'unité (1 = mois ; >1 = jours)" is either a day count (`Au - Du`) or a hardcoded `1`, and line 73 changes accordingly (0.542794 per day vs 22.78 per month).
- Formula anomalies found (see Q6): lines 64/65 swap HC and HP studio deltas; internet lines 87/88 reference the wrong column from E onward (`E87` uses `M86`, `L87` uses `T86`); `A5` sums `O8:O88` while `O5` sums `O8:O90`.

## Q1 - Who uses the app

Who signs in and edits?

- a. Only you (the landlord), single user.
- b. You edit, the tenant gets read-only access.
- c. Both edit.

➡️ Recommendation: a. The README describes your monthly routine only; a tenant view can come later and would change auth and data exposure, so keeping it out of v1 keeps the auth model of `french-gas-stations-scraper` as-is.

### Answer to Q1

For now, A

## Q2 - Is the 13th month part of the period

Each period sheet holds 13 months, and September is in both the closing period and the opening one. The regularization sums 13 months of charges against 12 advances, then a manual line corrects September.

- a. A period has 12 months (September to August). September belongs only to the new period. The regularization covers 12 months of charges against 12 advances.
- b. A period has 13 months as in the sheet, the overlap month exists in both, and the regularization needs a manual adjustment line.
- c. Something else (explain).

➡️ Recommendation: a. It removes the double-counted September and the manual "Réajustement" line, which looks like it exists only to compensate for the overlap. If the overlap is intentional (e.g. the water/electricity bill for August arrives in September), tell me why and I'll model that instead.

### Answer to Q2

A is right.

The 13 cols are caused by the first months of the first year (tab "Période-092025-092026"), if you look closely to rows 70-71 data.

Column "septembre 2027" is not necessary indeed.

## Q3 - Inputs stored, formulas computed

The JSON file could store only what you type (readings, prices, occupants, advances, bills), with every formula line (deltas, "Part Bailleur", "Part Locataire", "Facture", totals) computed by the app. Or it could also store the computed values.

➡️ Recommendation: store inputs only, compute everything else in the app. Stored computed values go stale whenever an input changes, and the formulas become testable code rather than data.

### Answer to Q3

Use Recommendation

## Q4 - Carried-forward values

For lines like 18 to 23 (prices), 2-3 (occupants) and 9 (previous index), the sheet uses `=C18` style formulas: the value is inherited until you override it. In the JSON, a month that was not edited could either have no value (inherits at display time) or a copied value written when the month is created.

- a. Inherit at display time: an unedited cell has no stored value and shows the previous month's value, styled as "inherited". Changing a price in October then also changes November if November was never overridden.
- b. Copy on month creation: the value is written into the new month once; later changes to the previous month do not propagate.

➡️ Recommendation: a. It is exactly how the sheet behaves today (a formula until overwritten), and it avoids a silent divergence when you correct an earlier month.

### Answer to Q4

A

## Q5 - "Previous index" lines are never editable

Lines 9, 12, 15 (and 48, 54, 56, 58 for electricity) equal the previous month's "actuel" index, except for the first month of the period.

➡️ Recommendation: they are read-only everywhere except the first month of a period, where you type them (until the year rollover feature exists). If you sometimes need to override one mid-year (meter replaced, e.g. `M54 = 2343.6+4.15`), say so and it becomes an override like Q4.

### Answer to Q5

Use Recommendation

## Q6 - Spreadsheet formula anomalies

I found three formulas that look like mistakes:

1. Line 64 "Delta Index HC Studio" computes `B59-B58` (HP studio indexes) and line 65 "Delta Index HP Studio" computes `B57-B56` (HC studio indexes). They are swapped, which charges HC consumption at the HP price and vice versa.
2. Internet "Part Bailleur/Locataire" from column E onward reference the bill 8 columns to the right (`E87` uses `M86`, `L87` uses `T86`), and line 86 has a chain `M86 = L86 ... V86 = U86` beyond column O.
3. The text in `A5` sums `O8:O88` while the amount in `O5` sums `O8:O90` (includes PAC).

➡️ Recommendation: the app implements the intended formula for all three (HC delta uses HC indexes, each month uses its own internet bill, the balance includes PAC). The app does not have to reproduce the sheet cell for cell.

### Answer to Q6

Recommendation is correct.

## Q7 - Who pays the heat pump maintenance

Line 90 has no landlord/tenant split. The 2025-2026 regularization charges the full 154 € to the tenant.

➡️ Recommendation: the tenant pays 100%, spread as 154/12 per month (with the rounding remainder on the last month, as `M90 = round(154/12,2)+0.04` does). The 154 € amount is editable per period.

### Answer to Q7

Use Recommendation

## Q8 - Electricity tariff mode

The sheet holds Base, HC and HP rows side by side, and the 2025-2026 sheet switched from Base to HC/HP during the year.

- a. The app shows all Base/HC/HP rows always, as the sheet does.
- b. Each month has a tariff mode (Base or HC/HP) and only the relevant rows are shown and computed.

➡️ Recommendation: b. Half the electricity rows are zeros in any given month, which makes the table harder to fill. A per-month mode inherited from the previous month (Q4) covers the switch you made last year.

### Answer to Q8

B

## Q9 - Electricity subscription unit

Line 72 is either the number of days (`Au - Du`, with a daily price on line 73) or `1` (with a monthly price on line 73).

- a. Keep both: each month picks "per day" or "per month" for the subscription.
- b. Only per day: line 72 is always `Au - Du`.
- c. Only per month.

➡️ Recommendation: a, inherited month to month like Q4. Both forms appear in your history and depend on how the supplier bills, which you do not control.

### Answer to Q9

From August 2026, we changed electricity supplier. The next doesn't provide a daily rate. The previous one did, hence the difference.

So A seems correct.

## Q10 - One reading date per month

The README describes a reading date (around the 15th) for the water meters, and electricity has "Du / Au" lines. Water has no date line in the sheet.

➡️ Recommendation: each month has a single reading date shared by all meters (water, electricity). It becomes electricity's "Au", and "Du" is the previous month's reading date. You pick it with a date picker prefilled by the suggestion rule (Q11).

### Answer to Q10

Lines 70-71 hold true for all sections.

## Q11 - Reading date suggestion rule

The README says: use the 15th if it is a Thursday, Friday, Saturday or Sunday; otherwise "the smallest". Your history shows Tue 15/12/2026 > Sun 13/12, Mon 15/02/2027 > Sun 14/02, Wed 15/09/2027 > Sat 11/09.

- a. If the 15th is Thu-Sun, suggest the 15th. Otherwise, suggest the closest Thu-Sun day **before** the 15th (Mon > Sun 14th, Tue > Sun 13th, Wed > Sun 12th).
- b. Otherwise, suggest the **earliest** day of the Thu-Sun block before the 15th (Mon > Thu 11th, Tue > Thu 10th, Wed > Thu 9th).
- c. Otherwise, suggest the closest Thu-Sun day before or after (Wed > Thu 16th).

➡️ Recommendation: a. It matches 2 of your 3 historic cases, never lands after the 15th, and you can always pick another date.

### Answer to Q11

See date for period 2026/2027 as golden record.

## Q12 - Advance on charges (line 7)

You enter 70 € when the bank transfer arrives.

➡️ Recommendation: line 7 stores only the amount received (empty means "not received yet"), with a one-click "70 €" suggestion taken from the period's monthly advance amount. No payment date for now.

### Answer to Q12

Use Recommendation

## Q13 - Regularization in v1

The "Régularisation" sheet summarizes the closed year: tenant share per section per month, total advances, the balance (who owes whom) and the new monthly advance (`-SUM(charges)/12`).

- a. In v1: a read-only regularization view computed from the period data.
- b. Later.

➡️ Recommendation: a. Every number on it is derived from the period data the app already holds (Q3), so it costs one view and no new input, and it is the reason the tracking exists.

### Answer to Q13

A

## Q14 - Several devices

IndexedDB is per browser. Will you edit from more than one device (phone and computer)?

- a. Yes: on app load, the app compares the local copy with the JSON in `tenant-bills-data` and pulls it when the remote one is newer.
- b. No, one device only.

➡️ Recommendation: a. Taking meter readings is a phone task and reviewing the table is a computer task; the check is one GitHub API call returning the file SHA.

### Answer to Q14

A. Same logic as the french gas station scraper app

## Q15 - Language of code and docs

The UI is in French.

➡️ Recommendation: code identifiers, JSON keys, commits and docs in English; UI labels in French; `GLOSSARY.md` maps each French label to its English term (e.g. "Avance sur charges" > `chargeAdvance`).

### Answer to Q15

Use Recommendation
