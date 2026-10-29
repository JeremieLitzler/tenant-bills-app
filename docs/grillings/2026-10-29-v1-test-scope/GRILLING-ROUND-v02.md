# Grilling round v02 — v1 test scope (issue #6)

## Settled in v01

- Q1: every module in `src/domain/` (formulas, inheritance, patch apply) gets a colocated `*.spec.ts`, run by Vitest in the Node environment, through exported functions only.
- Q2: a local script under `scripts/` reads the `.xlsx` and writes the fixture JSON; both the script and the JSON are committed.
- Q3: the real 2025-2026 values are not committed. The readings and other input values are randomized a little in the spreadsheet, and the fixture is built from those new values. (How, which values and how much are Q12 and Q13.)
- Q4: the formula specs assert every computed cell: per month and section the deltas, the bill, the landlord and tenant shares, plus the column N totals, the balance (line 6) and the settlement amount and direction (line 5).
- Q5: computed values are compared with `toBeCloseTo(expected, 6)`.
- Q6: `src/sync/` is tested with `fake-indexeddb` and an in-memory fake of the GitHub Contents API stubbed at `fetch` (keeps a file and its SHA, answers 409 on a stale SHA); tests drive `drainQueue()` and assert on the fake's final file.
- Q7: the Netlify function specs are copied with the functions from `french-gas-stations-scraper` and kept passing, adapted to the data repo and the login allowlist.
- Q8: component tests (`@vue/test-utils`, `happy-dom`) only for the period table and the "Saisie du mois" form.
- Q9: no Playwright end-to-end tests in v1.
- Q10: a GitHub Actions workflow on pull requests runs install, `pnpm audit signatures`, tests, then build. Netlify only builds.
- Q11: no coverage threshold, but the CI workflow runs the tests with `vitest --coverage` so the coverage is always visible. (Where it shows is Q17.)

## Q12 - How the spreadsheet gets randomized

Randomizing inputs only works if the formulas are then recalculated, because the expected values are the sheet's cached results. A script reading the `.xlsx` cannot recalculate formulas itself. Options:

- a) You copy the workbook, change the inputs by hand in Excel, save; the script then extracts inputs and cached results from that copy.
- b) A script copies the workbook and writes randomized inputs into the copy (formulas untouched, recalculation forced on open); you open the copy in Excel once and save it so Excel recalculates; the extraction script then reads it.
- c) A script writes randomized inputs into a copy and recalculates it with LibreOffice headless, with no manual step.

The randomized copy stays gitignored (`*.xlsx`), like the original.

➡️ Recommendation: b. It is reproducible (a seed in the script) without hand-editing about a hundred cells, and Excel stays the engine that computes the expected values, which is the point of a golden record. c would make LibreOffice's calculation the oracle instead of Excel's, and adds a heavy tool to the setup.

### Answer to Q12

B is what I had in mind

## Q13 - Which inputs are randomized, and how much

Meter indexes are cumulative, so changing each index independently could make a delta negative. Proposed rules:

- Indexes: keep the first previous index of each meter, then multiply each month's delta by a random factor between 0.85 and 1.15 and rebuild the indexes from the new deltas, rounded to the original precision (whole litres for water, whole kWh for electricity).
- Unit prices and monthly bills (electricity, internet, water treatment, softener, heat pump maintenance): multiplied by a random factor between 0.85 and 1.15, rounded to the original number of decimals.
- Left as they are: reading dates, occupant counts, tariff modes, the monthly tenant bill advance and the advances received.

Do you accept these rules?

➡️ Recommendation: yes. The deltas stay positive and plausible, every formula still gets exercised with non-trivial numbers, and the values left alone are either not private (dates, counts) or already public in `docs/examples/2026-2027.json` (the advance of 70).

### Answer to Q13

Randomize the water and electricity meters readings keeping the values month to month coherence to increasing values.
Randomize the water softener purchases
Set internet bill to 30.
Set heat pump maintenant to 169.

## Q14 - Script language and spreadsheet library

The script (or scripts, if Q12 is b) runs locally with Node 24, which runs TypeScript directly. Options:

- a) TypeScript with `exceljs` as a dev dependency: it reads cached formula results and can write input cells while keeping the formulas.
- b) TypeScript with SheetJS: its current versions are published on its own CDN rather than on the npm registry (the `xlsx` package on npm is an old version).
- c) Python with `openpyxl`: a second language and toolchain in the repo.

➡️ Recommendation: a. Same language and package manager as the app, a normal npm dependency, and it covers both reading cached values and writing inputs. I will check its API against current docs before the script is written.

### Answer to Q14

C since this is a one off task.

## Q15 - Fixture files

Q4 needs the expected computed values next to the input period file. Proposed layout in `tests/fixtures/`, both files written by the extraction script:

- `golden-period.json`: the randomized period file, in the shape of `docs/period-file.md`.
- `golden-expected.json`: every computed cell from Q4, keyed by month and section (and the period totals, balance and settlement).

Is that the layout?

➡️ Recommendation: yes. Two files keep the app's input format untouched (the period file is valid on its own, so the specs can also load it through the app's own parser), and the expected values stay in a shape made for the specs.

### Answer to Q15

yes

## Q16 - Seam for the component tests

The period table and the "Saisie du mois" form reach `src/sync/` through one composable. In their component tests (Q8), options:

- a) Mock the composable, and assert on the patch the view hands it on blur (`{ period, month, field, value }`).
- b) Use the real composable and the real queue, with `fake-indexeddb` and the `fetch` fake from Q6, and assert on the queued patch in IndexedDB.

➡️ Recommendation: a. Q6 already tests the queue end to end; the component test only needs to prove the view sends the right patch and shows inherited values, and a mocked composable keeps it fast and focused.

### Answer to Q16

A

## Q17 - Where the coverage shows in CI

Options:

- a) In the job log only (Vitest's `text` reporter).
- b) In the workflow run's job summary as a table, through a step that writes Vitest's `json-summary` to `$GITHUB_STEP_SUMMARY` (or an action such as `vitest-coverage-report-action`), without posting a pull request comment.
- c) As b, plus a comment on the pull request updated on every run.

➡️ Recommendation: b. It is visible on every run without opening the logs, and it adds no noise to the pull request.

### Answer to Q17

B

## Q18 - Where the decision is recorded

None of these choices seems to meet the ADR bar (hard to reverse, surprising, real trade-off): they are cheap to change before code exists. Proposal: a "Testing" section in `docs/architecture.md` (which module is tested at which seam, the fixture and how it is produced, CI), plus a comment on issue #6 linking to it. The randomized fixture is the one surprising point; the section explains why it is not the real data.

Is that where it goes?

➡️ Recommendation: yes. `docs/architecture.md` already holds the other scaffold choices made the same way.

### Answer to Q18

I'd prefer a `docs/architecture-tests.md`
