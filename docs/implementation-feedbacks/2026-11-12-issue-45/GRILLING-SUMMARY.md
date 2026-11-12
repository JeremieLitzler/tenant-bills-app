# Implementation feedback summary - #45 Open one period

## What was decided and why

The implementation of #45 (validation function, proxy client, `usePeriod`, the period page) was reviewed on two axes, Standards and Spec. The review found four defects, fixed at once in commit `725f287` (a page crash on malformed month entries, the wording "provision" against the glossary's "avance sur charges", the second year of the period id not checked, `NaN` accepted as an advance). Eight judgment calls became questions.

The behaviour stays as built: only a `ready` period is cached, while a `not-found` or `error` one is asked again on the next opening (Q3); `usePeriod` exposes `problems` and `isReadOnly` beyond the issue's list, and the architecture doc says so (Q4); the French strings stay, with the water-index sentence reworded (Q5); the placeholder labels months in French (Q6).

Three things change in the code. `file` becomes read-only in code, because the issue says "read-only `file`" and the architecture doc says views never write it (Q7). The unsafe `raw as unknown as PeriodFile` cast becomes a type guard, vague names are renamed, and `loadPeriod` gets a small helper for the repeated entry object (Q8). The copied period-file builder moves into one shared test helper (Q2).

The page spec stays but shrinks. It was asked whether it guarantees anything the `usePeriod` spec does not: it does (the route param reaching `usePeriod`, the status-to-element rendering, the months with their labels), and the crash found by the review was in the page, not in `usePeriod`. Three of its seven tests only repeated states already proven in the `usePeriod` spec, so they go. The rule behind it is written into `docs/architecture-tests.md` so the same call is made for future linked page and composable pairs (Q1, Q9, Q10).

## Decision index

- Q1 (v01, reopened as Q9 and Q10): came back as a question of yours; settled in Q10.
- Q2 (v01): one `tests/helpers/periodFile.ts` exporting `validPeriodJson(periodId?)`, used by the three specs.
- Q3 (v01): only `ready` periods are cached; `not-found` and `error` are asked again on the next opening.
- Q4 (v01): keep `problems` and `isReadOnly` on `usePeriod`, and list them in the State interface snippet of `docs/architecture.md`.
- Q5 (v01): keep all the strings; the `water-index` sentence becomes "Un index du compte d'eau n'est pas un nombre entier."
- Q6 (v01): keep the French month labels ("septembre 2026").
- Q7 (v01): wrap `file` in `readonly()`, typed `DeepReadonly<PeriodFile>`; adjust domain function signatures if needed.
- Q8 (v01): all three cleanups: type guard instead of the cast, renames (`currentStatus`, `periodEntry`, `JsonObject`), and an `entryWith(status, extra?)` helper in `loadPeriod`.
- Q9 (v02): informational answer to your Q1 question; no decision.
- Q10 (v02): keep four page tests (loader then name and twelve months, going to another page and back, read-only notice with the months, malformed month entries); delete the three that repeat the `usePeriod` spec (not found, error, unreadable file); record the rule in `docs/architecture-tests.md`.

## Rejected alternatives

- Q1/Q10: keep all seven page tests with only a doc amendment (A); not chosen, since three only re-prove `usePeriod` states.
- Q1/Q10: delete the page spec (C); not chosen, since the page wiring and the crash it caught are unique to it.
- Q2: leave the three copies (B), and break `tests/fixtures/golden-period.json` in each test (C); not chosen, no reason given.
- Q3: also cache `not-found` (B), or cache only `ready` and add a retry button (C); not chosen, no reason given. The retry button belongs to #15.
- Q4: expose only `isReadOnly` (B); not chosen, no reason given.
- Q5: show only the generic notice with no per-rule sentence (C); not chosen, no reason given.
- Q6: show the stored `YYYY-MM` (B), or the label with the stored value beside it (C); not chosen, no reason given.
- Q7: leave `file` as the reactive object and rely on the doc (B); not chosen, no reason given.
- Q8: do only the type guard (B), or none (C); not chosen, no reason given.

## Decided without being asked

- Q8 option A reads "all three" while my recommendation text said to skip the helper: I took the letter literally and will add `entryWith`. Object if you meant to skip it.
  - That's what I meant
- Q9 was left blank. I took it as "read", since it carried no decision.
  - Correct
- The rule added to `docs/architecture-tests.md` will read, in substance: a page spec over a composable that has its own spec covers only what the composable spec cannot guarantee (route wiring, rendering per state, template-level bugs) and does not repeat the composable's states; until F5 (#32), the period page is the one page with a spec. The exact wording is mine.
  - Approved
- The existing sentence of that doc, "Other components ... are not tested", is amended to point at this rule.
  - Approved
- If making `file` read-only forces domain signatures to take `DeepReadonly<PeriodFile>`, I change them in `src/domain/`; if that grows past a signature change, I stop and ask.
  - Correct
