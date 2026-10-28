# Grilling summary — period file JSON shape (issue #5)

Session started 2026-10-27, rounds v01 to v10. Domain docs written along the way: `GLOSSARY.md` (Month, Tenant bill advance, Balance, Tenant, Settlement), `docs/adr/0005-one-period-file-with-twelve-fixed-months.md`, and a superseded note on `docs/adr/0003`. Reference material moved: `docs/reference/sheet-formulas.md`. Throwaway prototype: `PROTOTYPE-patch-field.html`. Working sketch: `period-model-schema.json`.

## Shared understanding

A period is one JSON file in the data repo, `periods/YYYY-YYYY.json`. It holds `"schemaVersion": 1` (an integer), `"periodName": "2026-2027"`, a `settings` object and a `months` array. The array always has exactly twelve entries, September to August, written when the period is created. Each entry has its `month` key (`"2026-09"`, named after the calendar month in which its consumption window starts) and seven section objects, always present even when empty, in this order: `common`, `waterConsumption`, `waterTreatment`, `waterSoftener`, `electricity`, `internet`, `heatPumpMaintenance`. A section holds plain values keyed by the field catalogue below. There is no `{ value, type }` wrapper: JSON tells numbers from strings, and the catalogue says which strings are dates or enums.

The file stores inputs only (ADR 0001). Inside a section, an absent key means "not typed for this month": inheritable keys then take the previous month's value, the others are empty. Any stored number, 0 included, means "typed for this month". `null` never appears in the file. Typing a value always stores the key, even when it equals the inherited value, so a later correction of an earlier month no longer reaches it. The one exception is `common.tenantBillAdvance`, the amount the tenant actually transferred that month. It is present in every month from creation, starts at 0, and 0 means "nothing received". Clearing it writes 0, and the one-click suggestion uses `settings.monthlyTenantBillAdvance` on any month at 0.

The shape moved a lot from the starting proposal, and the reasons matter. The first rounds settled a sparse `months` object, with empty sections and months removed. Your `period-model-schema.json` then proposed the fixed twelve-month array with every section present, and it won. It reads like the sheet's twelve columns, gives stable git diffs, and the apply function never creates or removes a parent object. Your earlier sketch of one file per section was dropped for one file per period. The GitHub Contents API writes one file per `PUT`, and a queue drain (ADR 0004) must stay one commit with one SHA. All of this is recorded in ADR 0005.

A patch stays `{ period, month, field, value }` (ADR 0004). `field` is always the two-level path `"<section>.<key>"`, and the queue key is `<month>|<section>.<key>`. The app finds the month entry by its `month`. A patch with `value: null` removes the key, except for `tenantBillAdvance`, which is set to 0. A settings patch is `{ month: null, field: "settings.<key>" }`.

Meters store the current index under the meter's name (Ex: `<meter-name>`=`mainMeter`) and the previous one under `<meter-name>Previous`. The file accepts a `<meter-name>Previous` key in any month. The UI makes it editable only in the first month, in a tariff-switch month for that mode's registers, or after "Compteur remplacé". `readingDatePrevious` is first-month only. Only the reading date is stored. "Du" is computed from the previous month's date, and a date is stored only once the reading is taken. Water indexes are stored in litres, as integers (`"mainMeter": 533117`), and the app shows m³. Numbers are stored as typed, VAT as a multiplier (1.055), dates as `"YYYY-MM-DD"`, and enums in lowercase. In the other tariff mode, keys are kept and ignored.

Some inputs are monthly and never inherited:

- **Water softener purchase:** at most one per month, with the quantities summed.
- **Heat pump maintenance:** `heatPumpMaintenance.billedAmount`. When it is split, the app asks for the annual amount on new period creation and writes the twelve monthly values: 11 × ROUND(annual / 12, 2), and the remainder in August. It keeps no annual setting. 2025-2026 stores 154 in August only.

The internet bill is one inherited number. The "Balance" (_Avance sur charges - Consommations_) is a read-only computed view. No settlement payment is stored, so the 237.28 paid under the old 13-month computation appears nowhere.

A file with an unknown or newer `schemaVersion` opens read-only. So does a file whose `months` is not exactly the twelve months in order, or that has a month without `tenantBillAdvance`. Files are written with two-space indentation, a stable key order and a trailing newline.

The spreadsheet itself changed during the session, and these changes are now its golden record:

- You fixed the studio HC/HP deltas and removed the thirteenth month of 2025-2026.
- You corrected the August 2026 studio indexes and the 2026-2027 August leftover.
- You re-entered the 2025-2026 reading dates and water readings, with estimated studio readings in September 2025.
- You replaced B19 with a typed 0.

All three ADR 0003 anomalies are gone, so ADR 0003 is superseded and the Vitest cases expect the fixed sheet's cached values. Estimated readings carry no mark in the file.

Field catalogue (`(1)` = first month only in the UI; `...Previous` keys are allowed in the file in any month):

- `settings`: `monthlyTenantBillAdvance`.
- `common`: `readingDate`, `readingDatePrevious` (1), `landlordOccupants`, `tenantOccupants`, `tenantBillAdvance`.
- `waterConsumption`: `mainMeter`, `studioUnsoftenedMeter`, `studioSoftenedMeter`, each with `...Previous`; `pricePerM3`, `resourceWithdrawalFee`, `drinkingWaterFee`, `networkPerformanceFee`, `subscription`, `vat`.
- `waterTreatment`: `collectionConsumptionDistributor`, `collectionConsumptionCommunity`, `sanitationPerformance`, `vat`.
- `waterSoftener`: `description`, `quantity`, `unitPrice` (none inherited).
- `electricity`: `tariffMode` (`"base"` / `"hchp"`), `subscriptionUnit` (`"day"` / `"month"`), `mainBase`, `mainHc`, `mainHp`, `studioBase`, `studioHc`, `studioHp`, each with `...Previous`; `excisePerKwh`, `kwhPriceBase`, `kwhPriceHc`, `kwhPriceHp`, `subscriptionPerUnit`, `ctaTax`, `vat`.
- `internet`: `billedAmount`.
- `heatPumpMaintenance`: `billedAmount` (not inherited).

The example file `docs/examples/2026-2027.json` stores September 2026 in full, as the period's first month. It leaves out the sheet's zero placeholders (no HC/HP keys in Base mode, no softener purchase). For October, it stores only what differs from September or belongs to October: `tenantBillAdvance` 70, `internet.billedAmount` 23.48, `electricity.ctaTax` 2.42 and `heatPumpMaintenance.billedAmount` 12.83. October has no `readingDate`, since the reading is not taken yet.

## Decision index

- Q1 (v01): a month is keyed by its start month, `"2026-09"`.
- Q2 (v01): months as a sparse object keyed by month.
- Q3 (v01): per-month section objects holding flat keys.
- Q4 (v01): absent = not typed; any number, 0 included, = typed; `null` never stored; a `null` patch removes the key.
- Q5 (v01): opening values (previous indexes, opening date) are first-month fields.
- Q6 (v01): the current index is inheritable.
- Q7 (v01): input inventory confirmed; softener unit price not inherited.
- Q7b (v02): every softener field is non-inherited; no softener entry without a purchase.
- Q8 (v01): the internet bill is one inherited number.
- Q9 (v01): one softener purchase per month, quantities summed.
- Q10 (v01): top-level `settings` with `monthlyChargeAdvance` and `heatPumpAnnualAmount`.
- Q11 (v01): plain numbers as typed, `"YYYY-MM-DD"` dates, lowercase enums.
- Q12 (v01): `schemaVersion` integer and `period`.
- Q13 (v01): an ADR, `docs/period-file.md` and `docs/examples/2026-2027.json`.
- Q14 (v01): the formula file moves to `docs/reference/sheet-formulas.md`.
- Q15b (v03): patch `field` is `"<section>.<key>"`; queue key `<month>|<section>.<key>`.
- Q16 (v02): sections `common`, `water`, `waterTreatment`, `electricity`, `softener`, `internet`.
- Q17 (v02): empty sections and months are removed.
- Q18 (v02): `mainMeter` is the current index, `mainMeterPrevious` the previous one.
- Q19 (v03): the field catalogue.
- Q20 (v03): VAT as a multiplier.
- Q21 (v04): settings patch `{ month: null, field: "settings.<key>" }`.
- Q22 (v04): the other tariff mode's keys are kept and ignored.
- Q23 (v04): `...Previous` allowed in a tariff-switch month.
- Q24 (v04): `...Previous` allowed in any month via "Compteur remplacé".
- Q25 (v04): an unknown or newer file opens read-only; writes are refused.
- Q26 (v04): a new file has the required settings and no months.
- Q27 (v04): two-space indent, stable key order, trailing newline.
- Q28 (v05): the file accepts `...Previous` in any month; the UI gates editing; `readingDatePrevious` stays first-month only.
- Q29 (v06): typing a value always stores the key, even when equal to the inherited one.
- Q30 (v06): the example leaves out the sheet's zero placeholders.
- Q32 / Q32b (chat, v08): August 2026 studio indexes fixed in the 2025-2026 sheet.
- Q32c (v08): 2026-2027 M58 is `=L59`.
- Q32d (v08): the 2025-2026 studio readings are those of the updated sheet; August's typed previous index is a tariff-switch one.
- Q33 / Q33b (chat, v08): the sheet's 2025-2026 reading dates are correct.
- Q34 (chat, v08): the payment input is `tenantBillAdvance`.
- Q34b (v08): no settlement payment is stored; the balance is a read-only computed view.
- Q35 (v08): ADR 0003 is superseded.
- Q36 (v08): heat pump maintenance is a monthly non-inherited `billedAmount`.
- Q36b (v09): no annual amount in `settings`; the app asks for it when offering the split.
- Q37 (v08): the updated sheet sets October 2026's values.
- Q37b (v09): October's typed copies of September's values are treated as inherited.
- Q37c (v09): a reading date is stored only once the reading is taken.
- Q38 (v08): one file per period, `periods/YYYY-YYYY.json`.
- Q39 (v08): the identifier key is `periodName`.
- Q40 / Q40b (chat, v08): `"schemaVersion": 1`, an integer.
- Q41b (chat, v08): `tenantBillAdvance` is the amount actually paid.
- Q41c (v08): the key is `tenantBillAdvance`.
- Q41d (v08): it sits in `common`.
- Q41e (v08): it is 0 in every month from creation.
- Q41f (v08): its suggestion comes from the monthly amount in `settings`.
- Q41g (v09): the glossary term is **Tenant bill advance**.
- Q41h (v09): `tenantBillAdvance` is always present, 0 = nothing received, clearing writes 0, the suggestion is offered on any month at 0.
- Q41i (v10): the setting is `settings.monthlyTenantBillAdvance`.
- Q42 (v08): `months` is a fixed array of twelve, September to August.
- Q43 (v08): every month always holds all seven sections.
- Q44 (v08): sections `common`, `waterConsumption`, `waterTreatment`, `waterSoftener`, `electricity`, `internet`, `heatPumpMaintenance`.
- Q45 (v08): plain values, no `{ value, type }` wrapper.
- Q46 (v08): only `common.readingDate` is stored; "Du" is computed.
- Q47 (v08): I regenerate `docs/reference/sheet-formulas.md` from the fixed sheet.
- Q48 (v09): water indexes in litres, as integers.
- Q49 (v09): 2025-2026 B19 is a typed 0.
- Q50 / Q50b / Q50c (v09, v10): the 2025-2026 studio readings for September 2025 are estimates, and every water delta is now non-negative.
- Q51 (v10): estimated readings carry no mark.

Superseded:

- Q2 and Q17 by Q42 and Q43.
- Q5's validation part by Q28.
- Q10 by Q36b and Q41i.
- Q12's `period` by Q39.
- Q16's names by Q44.
- Q26's "no months" by Q42, Q43 and Q41e.
- Q31 by Q37 and Q37b.
- Q33's 0-day November by the updated sheet.
- Q4 for `tenantBillAdvance` only, by Q41e and Q41h.
- Q11's "as typed" for water indexes by Q48.
- The renames in the Q19 catalogue:
  - `water` became `waterConsumption` and `softener` became `waterSoftener` (Q44);
  - `chargeAdvanceReceived` became `tenantBillAdvance` (Q41b, Q41c);
  - `heatPumpMaintenance.billedAmount` was added (Q36);
  - `cta` became `ctaTax` (your Q52 annotation of this summary).

## Not grilled, decided to write the artefacts

Say so if any of these is wrong before I write `docs/period-file.md` and the example:

- The example's November 2026 to August 2027 entries hold only `tenantBillAdvance: 0` and `heatPumpMaintenance.billedAmount` (12.83, and 12.87 in August), as if the split were accepted at creation. Every other section is `{}`.
  - OK
- September 2026 in the example stores `readingDatePrevious` 2026-09-12 and the occupants 4 / 1. It also stores every typed price and VAT of column B, and the opening indexes in litres.
  - OK
- Q25 also refuses a water index that is not an integer.
  - OK
- The 2025-2026 golden record for Vitest is a period file built from the fixed sheet, with the indexes in litres. Where it lives and how it is produced belong to the spec, not to this session.
  - Should go into issue 4 or 6.
  - Issue #6 ("Confirm the v1 test scope") is the one: it already covers the formulas tested against the spreadsheet. Its body still says "ADR 0003 cases excepted", which Q35 makes obsolete.
- `period-model-schema.json` writes `common` on one line for brevity. The real files follow Q27's formatting.
  - OK

## Paste-ready section for issue #5

> The period file shape is settled (grilling `docs/grillings/2026-10-27-period-file-json-shape/`, ADR 0005).
>
> - One file per period, `periods/YYYY-YYYY.json`, with `schemaVersion` (integer, 1), `periodName`, `settings` (`monthlyTenantBillAdvance`) and `months`, a fixed array of twelve months from September to August, each keyed by `month` (`"2026-09"`) and holding seven section objects, always present: `common`, `waterConsumption`, `waterTreatment`, `waterSoftener`, `electricity`, `internet`, `heatPumpMaintenance`.
> - Sections hold plain values from a fixed catalogue (settings, occupants, reading date, indexes per meter, prices, tariff mode, subscription unit, softener, internet, heat pump, tenant bill advance).
> - Absent key = not typed (inherited where the field inherits); any number, 0 included, = typed; `null` never stored. Exception: `common.tenantBillAdvance` is always present, 0 = nothing received.
> - Water indexes in litres as integers; VAT as a multiplier; dates `"YYYY-MM-DD"`; enums lowercase.
> - The ADR 0004 patch `{ period, month, field, value }` maps with `field` = `"<section>.<key>"`; a settings patch has `month: null`.
> - An unknown or newer `schemaVersion`, or a malformed `months` array, opens the file read-only.
> - ADR 0003 is superseded: the fixed spreadsheet is the golden record.
> - Still to produce: `docs/period-file.md`, `docs/examples/2026-2027.json` (September and October 2026), and the regenerated `docs/reference/sheet-formulas.md`.
