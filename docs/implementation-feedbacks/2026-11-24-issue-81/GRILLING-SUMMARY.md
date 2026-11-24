# Implementation feedback summary - issue #81 (Nouvelle période)

## Shared understanding

The review of "Nouvelle période" left eight judgment calls. The code stays close to what was written, with these changes. The form validation moves to the domain (`src/domain/newPeriod.ts`), tested there. The form holds one `reactive` object with the domain names (`monthlyTenantBillAdvance`, `heatPumpInvoiceEstimate`). The invalid-values toast names the wrong field. A hint shows under the advance field when the prefill cannot be computed. While eligibility loads, the button shows "Vérification si une période peut être créée...". The `unknown` state stays.

The previous period follows the #110 decision (found by arithmetic, the year before, because the latest period in the list is wrong when a year is missing). The button is still gated on the latest period in the list, to show the refusal early, and on submit the year-before period of the typed start year is also read (reusing `previousPeriodId()`): when it exists and has no twelfth month, creation is refused with a warning toast.

`NewPeriod.vue` calls `useToasts()` and `usePeriods()` in setup, and `docs/architecture.md` gets one line saying components call composables in setup, never in handlers. Inputs get `rounded` and the text-input rule is recorded in `docs/design-system.md`.

## Decision index

- Q1, v01: the validation moves to `src/domain/newPeriod.ts` with a unit test.
- Q2, v01: the loading reason is "Vérification si une période peut être créée..."; `unknown` stays.
- Q3, v01: a hint under the advance field when the prefill cannot be computed.
- Q4, v01 and Q10b, v03: previous period by the #110 arithmetic, applied at submit as well as on the button gating.
- Q5, v01: the invalid-values toast says which field is wrong; the other texts are approved.
- Q6, v01: one `reactive` form object with the domain names.
- Q7, v01 and Q9b, v03: hooks called in setup.
- Q8, v01: `rounded` on inputs and the rule in `docs/design-system.md`.
- Q9, v02: one line in `docs/architecture.md` on composables in setup.
- Q11, v03: the arithmetic is already implemented (`previousPeriodId`), so reusing it is cheap.

## Rejected alternatives

- Q1: leaving the validation in the component.
- Q2: dropping `unknown` (allow when the previous period cannot be loaded).
- Q3: no hint, or falling back to the previous period's own `monthlyTenantBillAdvance` (it would invent a number).
- Q4 and Q10b: keeping the latest period in the list alone (against #110), gating only on submit, or refusing any start year not after the latest period.
- Q5: approving the generic invalid-values toast as it was.
- Q6: a `v-for` over the four fields, or leaving the four refs.
- Q8: leaving the inputs different from `MonthForm.vue`.

## Decided without being grilled

- The hint wording under the advance field and the field-specific invalid messages are mine to write; you will read them in the code.
  - OK
- The warning toast of the submit-time refusal reuses the wording of the button's refusal.
  - OK
- PR #187 was opened before this drill, so the code changes below land as new commits on it; nothing is pushed until you say so.
  - Yes
