# Impact 6 - period creation, status, closing and the twelfth month

## Impact

- Creation (Cases 4 and 5): the form asks `heatPumpInvoiceEstimate`, `monthlyTenantBillAdvance`, `startDate` and `tenantName`. The period name comes from the start year (a start in April 2026 gives 2026-2027). Only the first month is created, and it holds its monthly share of the heat pump amount: the split is computed as agreed (ROUND(annual / 12, 2) for eleven months, the remainder in the twelfth), and each later month receives its share when it is initialized.
  - Correct for the first part.
  - The `the annual heat pump amount is no longer split into twelve stored values at creation` is nuanced. The calculation remains as previously agreed, but only the first month is filled with the monthly share.
- Status (`docs/period-file.md` "The period status"): `draft`, `ongoing`, `ending`, `closed`, all computed. The states "estimated" and "provisional" of issues #62 and #86 are replaced.
- Closing (Case 7): enabled when twelve months exist, every month is complete and none has `common.estimated`; it writes the top-level `closedOn`.
- Twelfth month (Case 6): the estimate is written when that month is initialized, and `common.estimated` stays until you confirm the real reading.

## Judgment calls to review

- "A month is complete" is computed from the inputs the month requires, which depend on the tariff mode and on the softener. This list is not written down yet; the field catalogue must carry it.
  - This is correct.
  - If `waterSoftener`.`quantity` is typed as zero, then it is complete. If user types a non-zero value for `unitPrice` when `quantity` is zero, app must raise a validation error. Similarly, a non-zero `quantity` expects a `unitPrice`. When both `quantity` and `unitPrice` are set as non-zero, the `description` is required.
- Closing needs all twelve months (Case 7). A period that ends early has no way to close; not discussed.
  - Record a non-blocking grilling issue
  - Issue text drafted below; creating it was blocked in this session, see "Needed from you".
- The next advance prefill is the settlement "as shown at that moment" and is never updated.
  - Correct

## Path to done

1. Add the "required inputs" rule to the field catalogue (impact 1).
2. Implement status, completeness and eligibility in the domain from `docs/period-file.md`.
3. Rewrite #61, #62, #74, #78, #81 to #84 and #86 (impact 7).

> Approved if you agree with my notes.

## Issue to create (draft)

Title: `Grill closing a period that ends before twelve months`, label `needs-triage`.

> Closing needs the twelve months, all complete and none estimated (`docs/scenarios.md`, Case 7). A period that ends earlier (for example the tenant leaves) cannot be closed. Grill whether and how it can be, and what the settlement divides by. Not blocking.

## Done in the docs

The softener rules you gave are in `docs/period-file.md`, section `waterSoftener`.

## Needed from you

1. Tell me to create the draft issue above (or run it yourself); my attempt was refused by the permission check.
   1. I create issue 107 from your draft.
2. Nothing else: approved.

> Approved
