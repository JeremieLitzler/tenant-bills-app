# Implementation feedback summary - issue #76 (Saisie du mois)

## Shared understanding

The month form is a native form of fields that save on blur, at `/periods/[period]/months/[month]` (the route was first built without `months/` and fixed before the drill, to follow `docs/architecture.md:67`). The review found no defect beyond that route; the rest were judgment calls, all settled below.

The form hides the input lines of the inactive electricity tariff mode instead of showing them disabled as the table does, because a field that cannot be required should not appear on a phone. Fields are disabled in a read-only or closed period, since `setCell` would throw there. A text that is no valid value is marked with a message and a red ring around the input, and nothing is queued.

The decreasing-index warning is home-made because #63 is not built. It moves to `periodLines.ts` so #63 can replace its implementation behind the same function. The form is tested as a component (`MonthForm.spec.ts`, with a router plugin), with a one-test page spec for the route parameters, which is the seam `docs/architecture-tests.md` documents. The month page reuses the period page's states (misconfigured notice, not found, error). The out-of-period message stays until #15 replaces it. The picker keeps `router.push`.

## Decision index

- Q1, v01: move the decreasing-index check to `periodLines.ts`, for #63 to replace later.
- Q2, v01: keep hiding the lines of the inactive tariff mode.
- Q3, v01: keep the fields disabled in a read-only or closed period.
- Q4, v01: keep the message "Valeur invalide, elle ne sera pas enregistrée." and add a red ring around the input.
- Q5, v01: test `MonthForm` alone in `MonthForm.spec.ts`, plus a one-test page spec for the route parameters.
- Q6, v01: the month page reuses the period page's three states.
- Q7, v01: keep "Ce mois ne fait pas partie de la période." and its spec until #15.
- Q8, v01: a (`Line` type), b (date read and write pair, `inputMode` typed with `LineKind`) and c (spec uses `isInactiveTariffLine` and tests "hchp"); d dropped, the picker keeps `router.push`.
- Q9, v02: add a spec that changing "Option tarifaire" updates the visible lines, both ways.

## Rejected alternatives

- Q1: keep the check inside `MonthForm.vue`; remove it and let #63 add it.
- Q2: show the inactive tariff lines disabled, as the table does.
- Q3: leave the fields enabled and show the `setCell` error.
- Q4: change the message wording; drop the message and keep only `aria-invalid` and a ring.
- Q5: keep the whole-app page spec and rewrite the "one page with such a spec" sentence.
- Q6: keep the generic error and defer to #15.
- Q7: remove the message and let #15 own the case.
- Q8: none of the refactors; `router.replace` for the picker.
- Q9: no spec, trust the reading of the code.

## Decided without being asked

- The Q8 answer "Go recommendation" was read as a, b and c.
  - Approved for a to d points.
- Route path fix and the two stale doc paths were applied before the drill as plain defects.
  - OK
- After Q5 the sentence "the one page with such a spec" in `docs/architecture-tests.md` is still wrong (two page specs now exist); I will reword it with the decisions.
  - OK
