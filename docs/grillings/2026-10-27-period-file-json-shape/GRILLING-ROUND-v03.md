# Grilling round v03 — period file JSON shape (issue #5)

## Settled in v02

- Q7b: the softener unit price is not inherited; a month with no purchase stores no softener field. Q23 is corrected in `docs/grillings/2026-10-26-functional-breakdown/GRILLING-SUMMARY.md`.
- Q16: a month holds the section objects `common` (reading date, occupant counts, charge advance received), `water`, `waterTreatment`, `electricity`, `softener`, `internet`; no heat pump object. Every key sits two levels below the month.
- Q17: emptying the last key of a section removes the section, and emptying the last section removes the month; the file never holds `{}`.
- Q18: a meter's key holds its current index (`"mainMeter"`), and `<meter>Previous` holds the first-month previous index.

## Reopened

- Q15 was answered with a request for a prototype, not a decision. The prototype is below; Q15b asks the decision again.

## Q15b - What the patch `field` looks like (after the prototype)

Open `docs/grillings/2026-10-27-period-file-json-shape/PROTOTYPE-patch-field.html` in a browser. It runs every action through four shapes side by side, with six walkthroughs (monthly reading, retyping a cell offline, emptying the last key, previous index outside month 1, a corrupted patch, a 409 rebase with the phone). It shows that the four shapes always produce the same file: the choice changes only the queue and the error messages.

a. Dot path in `field`: `{ period, month, field: "water.mainMeter", value }`. ADR 0004 unchanged.
b. Separate property: `{ period, month, section: "water", field: "mainMeter", value }`. ADR 0004 gets a fifth property.
c. Path array in `field`: `{ period, month, field: ["water", "mainMeter"], value }`.
d. Flat catalogue id in `field`: `{ period, month, field: "waterMainMeter", value }`, mapped to `water.mainMeter` by the app's field catalogue.

➡️ Recommendation: a. It keeps ADR 0004's shape, reads the same as the path in the file and in a commit message, and makes a one-string queue key (`2026-10|water.mainMeter`) for IndexedDB. b is as clear but changes the ADR; c needs `JSON.stringify` for the queue key; d adds a second name for every field.

### Answer to Q15b

A

## Q19 - Which key names the file uses

Proposed catalogue, following Q16 (sections) and Q18 (current / `Previous`). `(1)` marks first-month-only keys (Q5). Your v01 example wrote `pricesPerM3`; I use the singular `pricePerM3`, as it is one price.

- `common`:
  - `readingDate`,
  - `readingDatePrevious` (1, the opening "Du"),
  - `landlordOccupants`,
  - `tenantOccupants`,
  - `chargeAdvanceReceived`.
- `water`:
  - `mainMeter`,
  - `studioUnsoftenedMeter`,
  - `studioSoftenedMeter`,
  - each with its `...Previous` (1);
  - `pricePerM3`,
  - `resourceWithdrawalFee`,
  - `drinkingWaterFee`,
  - `networkPerformanceFee`,
  - `subscription`,
  - `vat`.
- `waterTreatment`:
  - `collectionConsumptionDistributor`,
  - `collectionConsumptionCommunity`,
  - `sanitationPerformance`,
  - `vat`.
- `electricity`:
  - `tariffMode` (`"base"` / `"hchp"`),
  - `subscriptionUnit` (`"day"` / `"month"`),
  - `mainBase`,
  - `mainHc`,
  - `mainHp`,
  - `studioBase`,
  - `studioHc`,
  - `studioHp`,
  - each with its `...Previous` (1);
  - `excisePerKwh` (CSPE),
  - `kwhPriceBase`,
  - `kwhPriceHc`,
  - `kwhPriceHp`,
  - `subscriptionPerUnit`,
  - `ctaTax`,
  - `vat`.
- `softener`:
  - `description`,
  - `quantity`,
  - `unitPrice`.
- `internet`:
  - `billedAmount`.
- `settings` (top level):
  - `monthlyChargeAdvance`,
  - `heatPumpAnnualAmount`.

➡️ Recommendation: yes, use these names. They say what the sheet line is in English (Q15 of the breakdown), keep one key per line of the Q7 inventory, and repeat `vat` per section because each section has its own rate (1.055 and 1.1 in the sheet).

### Answer to Q19

Use Recommendation

## Q20 - How a VAT rate is written

The sheet stores the VAT as a multiplier: 1.055 (water), 1.1 (treatment), 1.2 (electricity). Bills print it as a percentage (5.5 %, 10 %, 20 %).

a. The multiplier, as in the sheet: `"vat": 1.055`.
b. The rate as a fraction: `"vat": 0.055`, the formulas use `1 + vat`.
c. The percentage as printed: `"vat": 5.5`, the formulas use `1 + vat / 100`.

➡️ Recommendation: a. It is what you already type in the sheet, the formulas in `ORIGINAL_SHEET_FORMULA.md` use it unchanged, and the Vitest cases (Q28 of the breakdown) can take the sheet's values as they are.

### Answer to Q20

A
