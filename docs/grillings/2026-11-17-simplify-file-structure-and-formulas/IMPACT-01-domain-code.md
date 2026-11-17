# Impact 1 - domain code (`src/domain/`)

## Impact

- `src/domain/inheritance.ts` and `inheritance.spec.ts` exist only for display-time inheritance (`resolveValue`, `Provenance`, `resolveMonthWindowStart`). Copying at initialization (ADR 0007) removes the need: delete both.
- `src/domain/periodFile.ts`: `PeriodSettings` and `settings` go away. `closedOn` and `monthlyTenantBillAdvance` become top-level, next to the new `heatPumpInvoiceEstimate` and `tenantName`. `readingDate` and `readingDatePrevious` become `startDate` and `endDate`. Every month now stores every `...Previous` index. New keys: `waterTreatment.monthlySubscriptionDistributor` and `monthlySubscriptionCommunity`, and `common.estimated`.
- `src/domain/validatePeriodFile.ts` assumes the fixed September-to-August months (line 41) and `settings` (lines 90 and 106). The new rules are in `docs/period-file.md` "Validation".

## Judgment calls to review

- Deleting `inheritance.ts` outright rather than keeping it unused: ADR 0007 "Consequences" says the domain no longer needs it.
  - Approve the deletion
- Keeping the inherited / not-inherited marks in `FIELD_CATALOGUE`: nothing is inherited at display time, but the marks are still the list of values copied forward and offered by the apply dialog.
  - Approved

## Path to done

1. Rewrite the types and the catalogue in `periodFile.ts` to `docs/period-file.md`.
2. Rewrite `validatePeriodFile.ts` and its spec to the new rules.
3. Delete `inheritance.ts` and its spec.
4. Fix the callers (`src/composables/usePeriods.ts`, `tests/helpers/periodFile.ts`) until the type check and Vitest pass.

> Approved

## Needed from you

Nothing: approved.

## Needed from you

Nothing: approved.
