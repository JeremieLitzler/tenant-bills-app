# Grilling round v09 — period file JSON shape (issue #5)

## Settled in v08

- Q32c: 2026-2027 M58 is now `=L59` (checked in the sheet uploaded on 2026-10-28).
- Q32d: the 2025-2026 readings are the ones in the updated sheet. Studio base: June 2209.8, July 2209.8 (July is billed on HC/HP: 39 and 112), August previous typed 2343.6, current 2493.6. July switches to HC/HP and August switches back to Base, so August's typed `studioBasePrevious` is a tariff-switch previous index, which Q23 allows. The file stores it as typed.
- Q33 is superseded by the updated sheet: the 2025-2026 reading dates are now 2025-10-25, 2025-11-15, 2025-12-19, 2026-01-17, 2026-02-15, 2026-03-15, 2026-04-13, 2026-05-15, 2026-06-14, 2026-07-15, 2026-08-10, 2026-09-12. No month has a 0-day window any more. 2026-2027 starts on 2026-09-12, the same day.
- Q34b: no settlement payment is stored. The balance "Avance sur charges - Consommations" (advances received minus tenant shares) is a computed, read-only view used to follow the balance. Under this reading, the 237.28 paid for the old computation appears nowhere in the file. Tell me in chat if I misread you.
- Q35: ADR 0003 is superseded. I added a note at the top of `docs/adr/0003-intended-formulas-over-spreadsheet-cells.md`.
- Q36: heat pump maintenance is a monthly, non-inherited input, `heatPumpMaintenance.billedAmount`. 2025-2026 stores 154 in August only; 2026-2027 stores 12.83 a month and 12.87 in August. Where the annual amount lives is Q36b.
- Q37: you said the updated sheet answers it. What it still leaves open is in Q37b and Q37c.
- Q38: one file per period, `periods/YYYY-YYYY.json`.
- Q39: the identifier key is `periodName`.
- Q41c: the key is `tenantBillAdvance`, not `chargeAdvance`. What the glossary calls it is Q41g.
- Q41d: it sits in `common`, so its patch field is `"common.tenantBillAdvance"`.
- Q41e: every month holds `"tenantBillAdvance": 0` from the period's creation. This breaks Q4's rule for this key; Q41h asks how.
- Q41f: the suggestion comes from `settings.monthlyChargeAdvance`.
- Q42: `months` is an array of exactly twelve entries, September to August, created with the period.
- Q43: every month always holds all seven sections, even when empty.
- Q44: sections `common`, `waterConsumption`, `waterTreatment`, `waterSoftener`, `electricity`, `internet`, `heatPumpMaintenance`, in that order.
- Q45: plain values, typed by the field catalogue.
- Q46: one stored date per month, `common.readingDate`; "Du" is computed; `common.readingDatePrevious` in the first month only.
- Q47: I regenerate `docs/reference/sheet-formulas.md` from the fixed sheet once this round's sheet questions (Q49, Q50) are settled.

I updated `period-model-schema.json` from these answers: `"schemaVersion": 1` as an integer, `settings.monthlyChargeAdvance` set to 50 (row 8 of the 2025-2026 sheet), and `tenantBillAdvance: 0` moved into each month's `common`. I left `heatPumpAnnualAmount` out until Q36b is answered.

## Reopened

- Q4 (absent vs explicit 0) is reopened for `tenantBillAdvance` by Q41e (Q41h).
- Q10 (`settings` = `monthlyChargeAdvance` + `heatPumpAnnualAmount`) is reopened by Q36 (Q36b).
- Q11 ("numbers as typed") is reopened by the water indexes, which are now typed in litres in 2025-2026 and in m³ in 2026-2027 (Q48).

## Q36b - Whether `settings.heatPumpAnnualAmount` stays

Under Q36, each month stores the amount billed. The annual amount (154) is only needed when the app offers the 12-way split.

a. Drop it. When a period is created (or later, from a "Répartir sur 12 mois" action), the app asks for the annual amount, writes the twelve `billedAmount` values (11 × 12.83 and 12.87 in August) and keeps nothing else. `settings` holds only `monthlyChargeAdvance`.
b. Keep it in `settings`, and the twelve monthly values are computed from it unless a month overrides them.

➡️ Recommendation: a. With b, 154 would be stored twice (once as the setting, once as what the months add up to), and the two could disagree. 2025-2026 (154 in August only) also has no use for it.

### Answer to Q36b

A

## Q37b - What October 2026's repeated constants store

You turned the water prices in October (rows 22-25) into `=B22`-style formulas, which means "inherited". Other rows of column C still hold typed copies of September's values: 26 (subscription 5.35), 27 (VAT 1.055), 42-47 (treatment), 70 (excise 0.03062), 74 (1 unit), 75 (22.78), 77 (VAT 1.2), and the HC/HP zeros.

a. The example treats them as inherited and stores none of them, the same way you treated rows 22-25. October then stores `tenantBillAdvance` 70, `internet.billedAmount` 23.48, `electricity.cta` 2.42 and `heatPumpMaintenance.billedAmount` 12.83 (plus `readingDate`, see Q37c).
b. The example stores each of them, as if typed in the app (Q29).

➡️ Recommendation: a. They match September exactly, and the one value that changed (CTA 2.42) is the one you typed differently. If you later want the sheet to match, these rows become `=B..` formulas like rows 22-25.

### Answer to Q37b

A

## Q37c - Whether a reading date ahead of today is stored

The 2026-2027 sheet types every "Au" date up to August 2027 (2026-11-15, 2026-12-13, ...). Today is 2026-10-28, so from October on these are dates in the future, and October's indexes are still `=C13`-style placeholders (no reading yet).

a. A reading date is stored only once the reading is taken. The example stores `readingDate` for September (2026-10-11) only.
b. Planned dates are stored ahead of time and overwritten if the reading happens on another day. The example stores October's 2026-11-15.

➡️ Recommendation: a. The month table and the phone's "reading" view can then show "October: not read yet" from the absence of the date. Under b, a stored date with no indexes would look like a reading that found nothing.

### Answer to Q37c

A

## Q41g - What the glossary calls the advance

The glossary has **Charge advance** (_Avance sur charges_). Your reason for `tenantBillAdvance` is that the name says who the money comes from.

a. Rename the term to **Tenant bill advance** (_Avance sur charges_), so the term and the key are the same words. "Charge advance" goes to _Avoid_.
b. Keep the term **Charge advance** and add "stored as `tenantBillAdvance`" to it.

➡️ Recommendation: a. One concept, one name, from the glossary to the file. b would also put a storage detail into the glossary, which describes the domain only.

### Answer to Q41g

A

## Q41h - How `tenantBillAdvance` departs from Q4

Q4 says: an absent key means "nothing typed", any number including 0 means "typed", and a patch with value `null` removes the key. With Q41e, `tenantBillAdvance` is always present and starts at 0.

a. `tenantBillAdvance` is always present in every month, and 0 means "nothing received" (whether not yet paid or not paid at all). Clearing the cell writes 0, never removes the key. The one-click suggestion (Q41f) is offered on any month at 0. Q25 refuses a file in which a month lacks the key. The provisional settlement counts 0 for those months.
b. Same as a, but the suggestion is offered only on months up to the current one.

➡️ Recommendation: a, if a suggestion button on future months is not in your way; b otherwise. Both keep Q4 unchanged for every other key.

### Answer to Q41h

A

## Q48 - Which unit the water indexes are stored in

2025-2026 now types the water indexes in litres (main 401454 to 525690; studio 2933, 2944, ...) and divides each delta by 1000. 2026-2027 types them in m³ (525.69, 533.117; studio 13.992, 14.614) with no division. So 2026-2027's opening index 525.69 is 2025-2026's closing 525690 / 1000.

a. m³, as the meters display them (`"mainMeter": 533.117`). The 2025-2026 golden file stores 401.454, 406.144, and so on.
b. Litres, as integers (`"mainMeter": 533117`). The 2026-2027 example stores 525690 and 533117; the app shows m³.
c. Each period keeps the unit its sheet uses, with a period setting naming it.

➡️ Recommendation: a. It is what you read on the meter and type on the phone, and Q11 stores numbers as typed. b avoids decimals, but every reading would be retyped ×1000. c makes every formula depend on a setting for no business reason.

### Answer to Q48

B

## Q49 - The formula in 2025-2026 B19

`Période-092025-092026` B19 (September 2025, studio softened water previous index, an input cell) holds `=(B18-B17)/1000`, which gives 0. The previous index of the other studio meter (B16) is a typed 0.

a. It should be a typed 0; you fix it before I regenerate the formula file.
b. It is intended.

➡️ Recommendation: a. An input cell with a formula would look like a computed value in the golden record.

### Answer to Q49

A. Excel Refreshed

## Q50 - The negative landlord treatment share in October 2025

In October 2025 (column C), the main meter moves 4.69 m³, but the two studio meters move 2.933 + 2.944 = 5.877 m³ (from 0, their September value). Treatment bills the landlord on main minus studio, so the landlord share is -1.91 (row 48). Water consumption (row 28) bills the landlord on the whole main delta, so it stays positive there.

a. It is correct: the studio meters started from 0 and their first delta covers more than the main meter's window. The golden record keeps -1.91.
b. A reading is wrong (please write which and the right value).

➡️ Recommendation: only your readings can decide. If the studio meters are behind the main meter, their total cannot exceed it over the same window, which points to b, unless the studio meters were started before 2025-09-14.

### Answer to Q50

I fixed the Excel with estimates "Actuel" readings.
