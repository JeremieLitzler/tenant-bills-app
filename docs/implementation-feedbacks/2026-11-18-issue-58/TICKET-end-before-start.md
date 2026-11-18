# Validate that a month's end date is not before its start date

Labels: `ready-for-agent`

## Parent

#31 (spec F4 Domain model and formulas). Found while implementing #58.

## What to build

`validatePeriodFile` reads neither `common.startDate` nor `common.endDate` today (only `closedOn` is checked as a real date). A month whose `endDate` is before its `startDate` loads without any message, and the electricity figures show a dash (a negative day count is uncomputable) with no explanation.

- Add a problem code (for example `end-before-start`) to `validatePeriodFile`, per month.
- Show it where the existing validation problems are shown, with a French message (to be worded with the user).

## Acceptance criteria

- [ ] A month with `endDate` before `startDate` is reported by `validatePeriodFile` (hand-written spec)
- [ ] A month with equal or ordered dates is not reported (hand-written spec)
- [ ] The problem is shown to the user with a French message
