# Grilling summary — period file JSON shape (issue #5)

_Partly superseded on 2026-11-17 by the grilling `2026-11-17-simplify-file-structure-and-formulas`: the passages and decisions that grilling replaces (the fixed twelve-month array, the sparse inheritance, `settings`, `readingDate`, the special previous-index months, the tariff-switch and "Compteur remplacé" rules, the heat pump split written at creation, the reading-date-based estimates) were removed from this summary. The current shape is in `docs/period-file.md`._

Session started 2026-10-27, rounds v01 to v10. Domain docs written along the way: `GLOSSARY.md` (Month, Tenant bill advance, Balance, Tenant, Settlement) and a superseded note on `docs/adr/0003`. Reference material moved: `docs/reference/sheet-formulas.md`. Throwaway prototype: `PROTOTYPE-patch-field.html`.

## Shared understanding (what still stands)

A period is one JSON file in the data repo, `periods/YYYY-YYYY.json`, holding `"schemaVersion"` (an integer), `"periodName": "2026-2027"` and a `months` array. Each entry has its `month` key (`"2026-09"`, named after the calendar month in which its consumption window starts) and seven section objects, always present even when empty, in this order: `common`, `waterConsumption`, `waterTreatment`, `waterSoftener`, `electricity`, `internet`, `heatPumpMaintenance`. A section holds plain values keyed by the field catalogue. There is no `{ value, type }` wrapper: JSON tells numbers from strings, and the catalogue says which strings are dates or enums.

The file stores inputs only (ADR 0001). Any stored number, 0 included, means "typed for this month". `null` never appears in the file. The one exception is `common.tenantBillAdvance`, the amount the tenant actually transferred that month. It is present in every month, starts at 0, and 0 means "nothing received". Clearing it writes 0.

One file per period, not one per section: the GitHub Contents API writes one file per `PUT`, and a queue drain (ADR 0004) must stay one commit with one SHA.

A patch stays `{ period, month, field, value }` (ADR 0004). `field` is the two-level path `"<section>.<key>"`, and the queue key is `<month>|<section>.<key>`. The app finds the month entry by its `month`. A patch with `value: null` removes the key, except for `tenantBillAdvance`, which is set to 0.

Meters store the current index under the meter's name (Ex: `<meter-name>`=`mainMeter`) and the previous one under `<meter-name>Previous`. Water indexes are stored in litres, as integers (`"mainMeter": 533117`), and the app shows m³. Numbers are stored as typed, VAT as a multiplier (1.055), dates as `"YYYY-MM-DD"`, and enums in lowercase. In the other tariff mode, keys are kept and ignored.

The monthly inputs that are never inherited:

- **Water softener purchase:** at most one per month, with the quantities summed.
- **Heat pump maintenance:** `heatPumpMaintenance.billedAmount`, the amount charged that month.

The internet bill is one inherited number. The "Balance" (_Avance sur charges - Consommations_) is a read-only computed view. No settlement payment is stored, so the 237.28 paid under the old 13-month computation appears nowhere.

A file with an unknown or newer `schemaVersion` opens read-only, and so does a file that has a water index that is not an integer. Files are written with two-space indentation, a stable key order and a trailing newline.

The spreadsheet itself changed during the session, and these changes are now its golden record:

- You fixed the studio HC/HP deltas and removed the thirteenth month of 2025-2026.
- You corrected the August 2026 studio indexes and the 2026-2027 August leftover.
- You re-entered the 2025-2026 reading dates and water readings, with estimated studio readings in September 2025.
- You replaced B19 with a typed 0.

All three ADR 0003 anomalies are gone, so ADR 0003 is superseded and the Vitest cases expect the fixed sheet's cached values. Estimated readings of 2025-2026 carry no mark in the file.

Field catalogue (kept keys; `...Previous` is the previous index of the meter):

- `common`: `landlordOccupants`, `tenantOccupants`, `tenantBillAdvance`.
- `waterConsumption`: `mainMeter`, `studioUnsoftenedMeter`, `studioSoftenedMeter`, each with `...Previous`; `pricePerM3`, `resourceWithdrawalFee`, `drinkingWaterFee`, `networkPerformanceFee`, `subscription`, `vat`.
- `waterTreatment`: `collectionConsumptionDistributor`, `collectionConsumptionCommunity`, `sanitationPerformance`, `vat`.
- `waterSoftener`: `description`, `quantity`, `unitPrice` (none inherited).
- `electricity`: `tariffMode` (`"base"` / `"hchp"`), `subscriptionUnit` (`"day"` / `"month"`), `mainBase`, `mainHc`, `mainHp`, `studioBase`, `studioHc`, `studioHp`, each with `...Previous`; `excisePerKwh`, `kwhPriceBase`, `kwhPriceHc`, `kwhPriceHp`, `subscriptionPerUnit`, `ctaTax`, `vat`.
- `internet`: `billedAmount`.
- `heatPumpMaintenance`: `billedAmount` (not inherited).

## Decision index

- Q1 (v01): a month is keyed by its start month, `"2026-09"`.
- Q3 (v01): per-month section objects holding flat keys.
- Q4 (v01): any number, 0 included, = typed; `null` never stored; a `null` patch removes the key.
- Q7 (v01): input inventory confirmed; softener unit price not inherited.
- Q7b (v02): every softener field is non-inherited; no softener entry without a purchase.
- Q8 (v01): the internet bill is one inherited number.
- Q9 (v01): one softener purchase per month, quantities summed.
- Q11 (v01): plain numbers as typed, `"YYYY-MM-DD"` dates, lowercase enums.
- Q12 (v01): `schemaVersion` integer.
- Q13 (v01): an ADR, `docs/period-file.md` and `docs/examples/2026-2027.json`.
- Q14 (v01): the formula file moves to `docs/reference/sheet-formulas.md`.
- Q15b (v03): patch `field` is `"<section>.<key>"`; queue key `<month>|<section>.<key>`.
- Q18 (v02): `mainMeter` is the current index, `mainMeterPrevious` the previous one.
- Q19 (v03): the field catalogue.
- Q20 (v03): VAT as a multiplier.
- Q22 (v04): the other tariff mode's keys are kept and ignored.
- Q25 (v04): an unknown or newer file opens read-only; writes are refused.
- Q27 (v04): two-space indent, stable key order, trailing newline.
- Q32 / Q32b (chat, v08): August 2026 studio indexes fixed in the 2025-2026 sheet.
- Q32c (v08): 2026-2027 M58 is `=L59`.
- Q33 / Q33b (chat, v08): the sheet's 2025-2026 reading dates are correct.
- Q34 (chat, v08): the payment input is `tenantBillAdvance`.
- Q34b (v08): no settlement payment is stored; the balance is a read-only computed view.
- Q35 (v08): ADR 0003 is superseded.
- Q36 (v08): heat pump maintenance is a monthly non-inherited `billedAmount`.
- Q37 (v08): the updated sheet sets October 2026's values.
- Q38 (v08): one file per period, `periods/YYYY-YYYY.json`.
- Q39 (v08): the identifier key is `periodName`.
- Q41b (chat, v08): `tenantBillAdvance` is the amount actually paid.
- Q41c (v08): the key is `tenantBillAdvance`.
- Q41d (v08): it sits in `common`.
- Q41e (v08): it is 0 in every month from creation.
- Q41g (v09): the glossary term is **Tenant bill advance**.
- Q41h (v09): `tenantBillAdvance` is always present, 0 = nothing received, clearing writes 0.
- Q43 (v08): every month always holds all seven sections.
- Q44 (v08): sections `common`, `waterConsumption`, `waterTreatment`, `waterSoftener`, `electricity`, `internet`, `heatPumpMaintenance`.
- Q45 (v08): plain values, no `{ value, type }` wrapper.
- Q47 (v08): I regenerate `docs/reference/sheet-formulas.md` from the fixed sheet.
- Q48 (v09): water indexes in litres, as integers.
- Q49 (v09): 2025-2026 B19 is a typed 0.
- Q50 / Q50b / Q50c (v09, v10): the 2025-2026 studio readings for September 2025 are estimates, and every water delta is now non-negative.
- Q51 (v10): estimated readings of 2025-2026 carry no mark.

Not grilled, kept: the 2025-2026 golden record for Vitest is a period file built from the fixed sheet, with the indexes in litres; issue #6 ("Confirm the v1 test scope") covers it.
