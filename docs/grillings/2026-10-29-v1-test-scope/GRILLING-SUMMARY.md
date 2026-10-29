# Grilling summary — v1 test scope (issue #6)

## Shared understanding

v1 tests the logic where it lives, at the narrowest seam that still shows the behaviour that matters, and adds no end-to-end layer.

`src/domain/` (formulas, inheritance from the previous month, patch apply) is tested with Vitest in the Node environment through its exported functions. The formulas are checked against a golden record: every computed cell of the sheet (deltas, bills, landlord and tenant shares per month and section, the column N totals, the balance and the settlement amount and direction), compared with `toBeCloseTo(expected, 6)` so summation order cannot fail a test while a sub-cent mistake still does.

The golden record is not the real 2025-2026 data. The issue's starting point was "test against the spreadsheet's computed values", and the period file grilling named `Période-092025-092026` as the record; but the `.xlsx` is gitignored as private consumption data and the repo is public. So the inputs are randomized in a copy of the workbook and Excel itself recalculates the expected values, keeping Excel as the oracle:

- A Python script (`openpyxl`, PEP 723 header, run with `uv run`) copies the workbook and writes randomized inputs, seeded so a rerun gives the same values, leaving the formulas untouched and forcing recalculation on open.
- Randomized: each water and electricity meter's monthly delta and each water softener purchase, multiplied by a factor between 0.85 and 1.15; indexes rebuilt from the first previous index so they keep increasing, rounded to whole litres or kWh; softener amounts to two decimals.
- Set: the internet bill to 30 every month; the heat pump maintenance to 169 in the months that already have one.
- Kept real: unit prices and fees (public tariffs), reading dates, occupant counts, tariff modes, the monthly tenant bill advance and the advances received.
- The user opens the copy in Excel and saves it; a second Python script extracts `tests/fixtures/golden-period.json` (a valid period file, shape of `docs/period-file.md`) and `tests/fixtures/golden-expected.json` (every computed cell). Both scripts and both fixtures are committed; the copied workbook stays gitignored.

The issue's "ADR 0003 cases excepted" no longer applies: ADR 0003 is superseded and the fixed sheet is the reference.

`src/sync/` (ADR 0004) is tested with `fake-indexeddb` and an in-memory fake of the GitHub Contents API stubbed at `fetch`, which keeps a file and its SHA and answers 409 on a stale SHA. Tests drive `drainQueue()` and assert on the fake's final file, so one `PUT` at a time, rebase and retry on 409, and "the queued edit wins" are tested as behaviour, not as calls.

The four Netlify functions keep the specs copied from `french-gas-stations-scraper`, adapted to the data repo and the login allowlist, since they are the security boundary.

Component tests (`@vue/test-utils`, `happy-dom`) cover only the period table and the "Saisie du mois" form, with the sync composable mocked: they assert the patch handed over on blur and that inherited values are shown. No Playwright end-to-end tests in v1: sign-in goes through real GitHub OAuth and the two risky paths are covered above.

A GitHub Actions workflow on pull requests runs install, `pnpm audit signatures`, the tests with coverage, then the build; Netlify only builds. Coverage has no threshold and shows as a table in the run's job summary, with no pull request comment.

All of this goes in a new `docs/architecture-tests.md`, linked by one line from `docs/architecture.md`. No ADR: every choice is cheap to change before code exists.

## Decision index

- Q1 (v01): every `src/domain/` module has a colocated spec, Vitest, Node environment, exported functions only.
- Q2 (v01): a local script reads the workbook and writes the fixture JSON; script and JSON committed.
- Q3 (v01): real values are not committed; inputs are randomized in the spreadsheet and the fixture is built from the new values.
- Q4 (v01): the formula specs assert every computed cell, totals, balance and settlement.
- Q5 (v01): `toBeCloseTo(expected, 6)`.
- Q6 (v01): `src/sync/` tested with `fake-indexeddb` and a stateful GitHub Contents API fake at `fetch`, through `drainQueue()`.
- Q7 (v01): Netlify function specs copied from the reference project and kept passing.
- Q8 (v01): component tests only for the period table and the "Saisie du mois" form.
- Q9 (v01): no Playwright end-to-end tests in v1.
- Q10 (v01): GitHub Actions on pull requests (install, audit signatures, tests, build); Netlify only builds.
- Q11 (v01): no coverage threshold; CI runs `vitest --coverage`.
- Q12 (v02): a script writes randomized inputs into a workbook copy, Excel recalculates on a manual open and save, a second script extracts.
- Q13 (v02): meters and softener purchases randomized with increasing indexes; internet 30; heat pump maintenance 169.
- Q14 (v02): Python with `openpyxl`.
- Q15 (v02): `tests/fixtures/golden-period.json` and `tests/fixtures/golden-expected.json`.
- Q16 (v02): component tests mock the sync composable.
- Q17 (v02): coverage table in the job summary, no PR comment.
- Q18 (v02): decisions recorded in `docs/architecture-tests.md`.
- Q19 (v03): factor 0.85 to 1.15, seeded; whole litres and kWh; softener amounts to two decimals.
- Q20 (v03): prices, fees, dates, occupant counts, tariff modes and advances keep their real values.
- Q21 (v03): heat pump maintenance 169 only in months that already have one.
- Q22 (v03): both Python scripts committed under `scripts/`.
- Q22b (v03): PEP 723 inline header, `uv run`.
- Q23 (v03): one line in `docs/architecture.md` links to `docs/architecture-tests.md`.

Superseded: none. Q3 replaced the golden record named in the period file grilling (the real `Période-092025-092026` values) with a randomized copy of it.

## Not grilled, decided by default

These were needed to write the above and were not asked; object if any is wrong.

- Script names: `scripts/randomize-golden.py` and `scripts/extract-golden.py`.
  - OK
- How the two Vitest environments coexist (Node for `src/domain/`, `src/sync/` and the functions; `happy-dom` for the two views): left to the implementation (Vitest `projects` or a per-file environment comment).
  - OK
- How the coverage table reaches the job summary (a small step writing `json-summary`, or an action): left to the implementation.
  - Seems fine
- No glossary change: the session introduced no domain term ("golden record" is test vocabulary, not domain language).
  - OK

## Paste-ready comment for issue #6

> The v1 test scope is settled in `docs/grillings/2026-10-29-v1-test-scope/` and written down in `docs/architecture-tests.md`.
>
> - **Domain** (`src/domain/`): Vitest, Node environment. Formulas checked against every computed cell of the sheet (deltas, bills, shares, column N totals, balance, settlement) with `toBeCloseTo(expected, 6)`. No ADR 0003 exception: it is superseded.
> - **Golden record**: not the real 2025-2026 data, since the repo is public. A Python script (`openpyxl`, `uv run`) writes randomized meter readings and softener purchases into a copy of the workbook (factor 0.85 to 1.15, seeded, indexes still increasing), internet set to 30 and heat pump maintenance to 169; I recalculate it in Excel; a second script extracts `tests/fixtures/golden-period.json` and `tests/fixtures/golden-expected.json`. Scripts and fixtures are committed, the workbook copy is not.
> - **Save queue** (`src/sync/`): `fake-indexeddb` plus a stateful GitHub Contents API fake at `fetch` (SHA, 409), driven through `drainQueue()`.
> - **Netlify functions**: specs copied from `french-gas-stations-scraper` and adapted.
> - **Components**: only the period table and the "Saisie du mois" form, with the sync composable mocked.
> - **End-to-end**: none in v1.
> - **CI**: GitHub Actions on pull requests (install, `pnpm audit signatures`, tests with coverage, build). No coverage threshold; coverage shown in the job summary. Netlify only builds.
