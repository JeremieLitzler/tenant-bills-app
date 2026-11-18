# Implementation feedback summary - issue 58 (Electricity figures)

## Shared understanding

Issue 58 added the electricity figures to `src/domain/periodFigures.ts` (commit `b737a47`): six kWh deltas, subscription units, landlord share, tenant share and bill, priced per month in the month's own tariff mode. The code review found no defect, only judgment calls, settled here.

The deltas of the inactive tariff mode stay at `0`, as in the sheet and the golden record, so the table reads `tariffMode` to show them as not applicable. `subscriptionUnits` stays a public figure. The emptied-input spec gains one case for a missing `tariffMode`. In `electricityFigures`, the destructured `share` that shadowed the local function becomes `occupantRatio`, and each term is read by name instead of by position. The template-literal register keys stay, because the compiler checks them.

An end date before the start date does not get a validation check in this issue: `validatePeriodFile` reads neither date today, so a separate ticket will add it, with its French message. Meanwhile the figures make a negative day count uncomputable ("—"). The user notes this is a silent error until the validation ticket exists: the dash has no explanation.

The figure calculations leave `periodFigures.ts`, which was 206 lines and keeps growing with each section. They move to `src/domain/figures/`: `figureMath.ts` (the shared helpers), `waterConsumptionFigures.ts`, `waterTreatmentFigures.ts` and `electricityFigures.ts`. `periodFigures.ts` stays where it is as the entry point (`MonthFigures`, `PeriodFigures`, `computePeriodFigures`) and re-exports the figure types, so the three importers do not change. Behaviour and specs are unchanged.

## Decision index

- Q1, v01: keep `0` for the inactive tariff mode deltas.
- Q2, v01: reopened, see Q7 and Q8.
- Q3, v01: `subscriptionUnits` stays public.
- Q4, v01: add one spec case, for a missing `tariffMode` only.
- Q5, v01: rename the shadowing `share` to `occupantRatio` and name each term read.
- Q6, v01: keep the template-literal register keys.
- Q7, v02: the end-before-start check goes into a separate ticket, not into issue 58.
- Q8, v02: a negative day count makes the units, shares and bill uncomputable, for now.
- Q9, v02: split all the computed sections and the shared helpers out of `periodFigures.ts` now.
- Q10, v02: the new files live in `src/domain/figures/`, `periodFigures.ts` stays at `src/domain/`.

## Rejected alternatives

- Q1: return `undefined` for the inactive deltas. Not in the user's words; the golden record has zeros.
- Q3: make `subscriptionUnits` internal.
- Q4: one case per missing input (a), or keep the spec as it is (c).
- Q5: leave the shadowed name.
- Q6: an explicit table of the register keys.
- Q7: add the check to `validatePeriodFile` in this branch. The user: "B is correct".
- Q8: rely on validation alone. The user chose A "for now, but this is silent error for me".
- Q9: move only electricity out (b), or keep one file until the next section (c).
- Q10: flat files in `src/domain/`.

## Decided without being grilled

- The new end-before-start ticket is not created yet: creating it, and commenting on it, needs the user's go-ahead. A pointer comment next to the day count in `electricityFigures.ts` will name it once it exists.
  - Approved creation
- The split goes in its own commit, after the Q5 rename and the Q4 spec case, as Q9's recommendation said.
  - Approved
