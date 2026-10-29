# The period file

Each period is one JSON file in the data repo `JeremieLitzler/tenant-bills-data`, at `periods/YYYY-YYYY.json` (ADR 0005). It stores inputs only; every delta, share, bill and balance is computed (ADR 0001). Example: [`docs/examples/2026-2027.json`](examples/2026-2027.json). The formulas that consume these inputs are in [`docs/reference/sheet-formulas.md`](reference/sheet-formulas.md).

## Top level

```json
{
  "schemaVersion": 1,
  "periodName": "2026-2027",
  "settings": { "monthlyTenantBillAdvance": 70 },
  "months": [ ... twelve month entries ... ]
}
```

- `schemaVersion`: integer, currently `1`, bumped on any breaking change.
- `periodName`: `"YYYY-YYYY"`, the same as the file name.
- `settings`: values set once per period (see below).
- `months`: exactly twelve entries, September to August, in order, created with the period.

## A month entry

```json
{
  "month": "2026-10",
  "common": { "tenantBillAdvance": 70 },
  "waterConsumption": {},
  "waterTreatment": {},
  "waterSoftener": {},
  "electricity": { "ctaTax": 2.42 },
  "internet": { "billedAmount": 23.48 },
  "heatPumpMaintenance": { "billedAmount": 12.83 }
}
```

- `month`: `"YYYY-MM"`, the calendar month in which the month's consumption window starts. The "September" month runs from the mid-September reading date to the mid-October one.
- The seven section objects are always present, in this order, even when empty.

## Absent, zero and inherited

- An absent key means "not typed for this month". An inherited key (marked I below) then takes the previous month's value; a non-inherited key (N) is empty.
- Any stored number, `0` included, means "typed for this month". Typing a value always stores it, even when it equals the inherited value.
- `null` never appears in the file.
- Exception: `common.tenantBillAdvance` is present in every month from the period's creation, starting at `0`; `0` means "nothing received".
- Exception: in the twelfth month, indexes stored without `common.readingDate` are estimates (see "The estimated twelfth month").

## Values

- Numbers are stored as typed, with no rounding.
- Water indexes are in litres, as integers (`533117` for 533.117 m³); the app shows m³.
- VAT is a multiplier: `1.055` for 5.5 %.
- Dates are `"YYYY-MM-DD"` strings.
- Enums are lowercase strings.

## Settings

- `monthlyTenantBillAdvance`: the expected monthly tenant bill advance, suggested in one click on any month whose `tenantBillAdvance` is `0`. Required when the period is created. "Nouvelle période" prefills it with the previous period's next advance, CEIL(total tenant shares / 12), as shown at that moment (estimated or actual); it is not updated afterwards.
- `closedOn`: `"YYYY-MM-DD"`, the date "Clôturer la période" was pressed. Absent while the period is open (ADR 0006).

## Closing a period

- "Clôturer la période" is enabled when every month has `common.readingDate` and every tenant share is computable. The confirmation lists the months whose `tenantBillAdvance` is `0`, without blocking, and requires ticking that the period's water bills were received and typed.
- A closed period is read-only, `settings` included, and cannot be reopened. A patch queued before the close reached the file still applies, and the app flags it.
- "Nouvelle période" is refused while the previous period's file exists and its twelfth month is neither estimated nor read. Without a previous file, it is allowed.

## The estimated twelfth month

- "Estimer les relevés", on the twelfth month, is enabled once the eleventh month has its `readingDate`. It writes an estimated current index for each meter as ordinary patches: the eleventh month's current index plus the meter's delta in the previous period's twelfth month, or in this period's eleventh month when that delta is missing.
- The delta is a total per meter: HC + HP when the source month was in `hchp`. When the twelfth month is in `hchp`, the total is split 30 % HC, 70 % HP; in `base`, it goes to the Base register.
- The twelfth month is estimated while it holds indexes but no `common.readingDate`. Its "Au", for a per-day subscription, is the suggested reading date, not stored. Typing the reading date makes it read; the confirmation lists the indexes still equal to their estimate.

## Keys per section

(I) inherited, (N) not inherited. A key ending in `Previous` is the previous index of the meter of the same name.

### `common`

- `readingDate` (N): the reading date ("Au") closing the month's window for every section. Stored only once the reading is taken. "Du" is not stored: it is the previous month's `readingDate`.
- `readingDatePrevious` (N): the opening "Du" of the period. First month only.
- `landlordOccupants` (I), `tenantOccupants` (I): occupant counts.
- `tenantBillAdvance` (N, always present): the amount the tenant actually transferred that month.

### `waterConsumption`

- `mainMeter`, `studioUnsoftenedMeter`, `studioSoftenedMeter` (I): current indexes, in litres.
- `mainMeterPrevious`, `studioUnsoftenedMeterPrevious`, `studioSoftenedMeterPrevious` (N): previous indexes, in litres (see "Previous indexes").
- `pricePerM3`, `resourceWithdrawalFee`, `drinkingWaterFee`, `networkPerformanceFee` (I): prices per m³.
- `subscription` (I): the monthly subscription.
- `vat` (I).

### `waterTreatment`

The indexes are those of `waterConsumption`; they are not stored twice.

- `collectionConsumptionDistributor`, `collectionConsumptionCommunity`, `sanitationPerformance` (I): prices per m³.
- `vat` (I).

### `waterSoftener`

At most one purchase per month; several purchases are summed into one. A month without a purchase has an empty object.

- `description` (N), `quantity` (N), `unitPrice` (N).

### `electricity`

- `tariffMode` (I): `"base"` or `"hchp"`. The keys of the other mode are kept and ignored.
- `subscriptionUnit` (I): `"day"` (the number of units is the number of days between "Du" and "Au") or `"month"` (one unit).
- `mainBase`, `mainHc`, `mainHp`, `studioBase`, `studioHc`, `studioHp` (I): current indexes, in kWh.
- the same six keys ending in `Previous` (N): previous indexes.
- `excisePerKwh` (I): the CSPE / excise rate.
- `kwhPriceBase`, `kwhPriceHc`, `kwhPriceHp` (I): prices excluding tax.
- `subscriptionPerUnit` (I): subscription per day or per month, excluding tax.
- `ctaTax` (I): the CTA amount.
- `vat` (I).

### `internet`

- `billedAmount` (I): the monthly bill, one number.

### `heatPumpMaintenance`

- `billedAmount` (N): the amount charged that month. When a period is created, the app asks for the annual amount and offers to split it: ROUND(annual / 12, 2) for eleven months and the remainder in August. 2025-2026 holds 154 in August only.

## Previous indexes

A `...Previous` key is accepted in any month: it is the record of where the meter started for that month. The app makes it editable only:

- in the first month of the period;
- in a tariff-switch month, for the registers of the new mode;
- after the "Compteur remplacé" action.

Elsewhere, the previous index is the previous month's current index. `readingDatePrevious` is first-month only.

## Patches

A patch (ADR 0004) is `{ period, month, field, value }`:

- `field` is `"<section>.<key>"`, for example `"electricity.ctaTax"`; the queue key is `<month>|<section>.<key>`.
- A settings patch is `{ month: null, field: "settings.<key>" }`.
- `value: null` removes the key, except for `common.tenantBillAdvance`, which is set to `0`.

## Validation

The app opens a file read-only, and refuses to write it, when:

- `schemaVersion` is unknown or newer than the app's;
- `months` is not exactly the twelve months of the period in order;
- a month lacks `common.tenantBillAdvance`;
- a water index is not an integer;
- `settings.closedOn` is present and not a `"YYYY-MM-DD"` date.

## Writing

Two-space indentation, keys in the order of this document with each `...Previous` key placed right before its current key (as in the example), and a trailing newline, so each commit's diff shows only the edited cells.
