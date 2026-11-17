# Impact 3 - converting the existing 2025-2026 file

## Impact

- The root `2025-2026.json` is `schemaVersion` 1: `settings` holds `monthlyTenantBillAdvance` and `closedOn`, there are twelve months, each with `common.readingDate`, and the first month holds `readingDatePrevious`. The data repo file `periods/2025-2026.json` has the same shape.
- ADR 0007: the app reads only `schemaVersion` 2 and opens an older file read-only. The file must be converted once, before v2 code meets the real data.

## What the converter must decide

- Move `settings.closedOn` and `monthlyTenantBillAdvance` to the top level.
  - Approved
- `heatPumpInvoiceEstimate` and `tenantName` are not in the old file: you give the values.
  - I will.
- `readingDate` becomes `endDate`; each `startDate` is the previous month's `endDate`, and the first month's is its `readingDatePrevious`.
  - Approved
  - first month's of period `2025-2026` is `2025-09-15`
  - Conflict: `2025-2026.json` stores `readingDatePrevious: 2025-09-14` in the first month, not the 15th. Which one is right? See "Needed from you".
- Copy every inheritable value forward (the old file leaves them absent) and fill each `...Previous` index from the previous month's current index.
  - Me: the script does it. No input needed from you.
- The two collection subscription keys are unknown: you give them, otherwise the 2025-2026 water treatment figures change (see impact 2).
  - Name the property names behind what you call "collection subscription"
  - `waterTreatment.monthlySubscriptionDistributor` and `waterTreatment.monthlySubscriptionCommunity` (`docs/period-file.md`, "waterTreatment"). The script reads them from the workbook (rows 42 and 43, 1.0208 and 0.735 in every month of 2025-2026), so you give no value.
- Estimated readings of September 2025 stay unmarked, as decided in `2026-10-27-period-file-json-shape` (Q51).
  - OK

## Path to done

1. You provide `tenantName` and `heatPumpInvoiceEstimate`, and settle the first `startDate`.
2. Write the one-off script in `scripts/`, with a spec that its output passes the new `validatePeriodFile`.
3. Run it on a copy and diff it against `2025-2026.json`.
4. You decide when it is committed to the data repo; I will not push to it.

> Waiting on two points: the first `startDate` and the line about who copies the values (answered above).

## Needed from you

1. The first month's `startDate` of 2025-2026: `2025-09-14` (as stored in `readingDatePrevious`) or `2025-09-15`?
2. The `tenantName` and the `heatPumpInvoiceEstimate` of the 2025-2026 period.
3. Approve the two answers I gave in "What the converter must decide".
