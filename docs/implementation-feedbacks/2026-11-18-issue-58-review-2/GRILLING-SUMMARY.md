# Implementation feedback summary - issue 58, second review (Electricity figures)

## Shared understanding

The second review ran after the figures were split into `src/domain/figures/` (one file and one spec per section). It found no defect, only judgment calls. The first drill (`../2026-11-18-issue-58/GRILLING-SUMMARY.md`) is not reopened.

A month without `tariffMode` has no way to tell which registers apply, so the fallback to `base` goes away: all six electricity deltas, the shares and the bill of that month are uncomputable ("—"), with no throw, so the other months stay readable. The user first asked for a throw; the narrowed re-ask quoted `periodFigures.ts` ("never a silent zero") and #58's criterion on emptied inputs, and the user chose the dash ("Ok ok, let's go for A"). A new ticket will ask `validatePeriodFile` to report a missing tariff mode, next to #121.

The electricity test that adds leftover values to the inactive mode is rewritten so that every key of the other mode (all registers, previous indexes and prices) gets a value, in a `base` month and in an `hchp` month. `all` becomes `allDefined` in the helpers and the three section files, and the `terms!` assertion is replaced by an early return. The assembly test in `periodFigures.spec.ts` is replaced by one golden value read through `computePeriodFigures`. `figureMath.ts` gets its own spec (`roundCents`, `allDefined`, `sum`, `addBill`, `occupantRatios`), at the user's request. `docs/architecture.md` lists the `src/domain/figures/` folder.

The repeated shares and bill tail across the three sections stay as they are, until the water softener and internet sections arrive.

## Decision index

- Q1, v01: reopened, see Q7 and Q8.
- Q2, v01: reopened, see Q9 and Q10.
- Q3, v01: leave the repeated shares and bill tail.
- Q4, v01: rename `all` to `allDefined` and replace `terms!` with an early return.
- Q5, v01: replace the assembly test with one golden value through `computePeriodFigures`.
- Q6, v01: add the `figures/` folder to `docs/architecture.md`.
- Q7, v02: a missing `tariffMode` makes all electricity figures of that month uncomputable, no throw, no fallback.
- Q8, v02: create a new ticket for validating the tariff mode, separate from #121.
- Q9, v02: information only, the user read it.
- Q10, v02: rewrite the inactive-mode test to cover every key of the other mode.

## Rejected alternatives

- Q1: keep the fallback to `base`. The user: "No fallback."
- Q7: throw an error. The user first asked for it, then chose the dash after the narrowed re-ask.
- Q7: keep the fallback to `base`.
- Q8: widen #121, or no ticket.
- Q3: share only the type (b), or extract the helper and the type (c).
- Q4: rename only (b), or leave both (c).
- Q5: remove the assembly test (b), or keep it (c).
- Q6: leave the doc.
- Q10: keep the test as it is.

## Decided without being grilled

- The `figureMath.ts` spec was added at the user's request, outside the numbered questions.
  - Correct
- The new tariff mode ticket is drafted in this folder and created only after the user's go-ahead. A pointer comment next to the missing-mode branch will name it once it exists.
  - Correct and I approved its creation
- The code changes go in one commit, the `figureMath.ts` spec and the docs in another.
  - that's 3 commits for me
