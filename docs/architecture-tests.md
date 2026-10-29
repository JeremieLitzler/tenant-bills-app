# Tests

The v1 test scope, settled in `docs/grillings/2026-10-29-v1-test-scope/` (issue #6). None of these choices met the ADR bar: they are cheap to change before the code grows.

Tests are colocated `*.spec.ts` files run by Vitest; test data lives in `tests/fixtures/` (see `docs/architecture.md`). There are no end-to-end tests in v1.

## Which module is tested at which seam

- `src/domain/` (formulas, inheritance from the previous month, patch apply): Vitest in the Node environment, through the exported functions only. The formulas are checked against the golden record below.
- `src/sync/` (IndexedDB patch queue, `drainQueue()`, 409 rebase, SHA check, ADR 0004): Vitest with `fake-indexeddb` and an in-memory fake of the GitHub Contents API stubbed at `fetch`. The fake keeps one file and its SHA and answers 409 when the SHA sent is stale. Tests drive `drainQueue()` and assert on the fake's final file: one `PUT` at a time, rebase and a single retry on 409, the queued edit wins on a cell changed on both sides.
- `netlify/functions/`: the specs are copied with the functions from `french-gas-stations-scraper` and adapted to the data repo and the login allowlist. They guard the app's security boundary (the allowlist in `github-auth-callback`, the repo restriction in `github-api-proxy`).
- Components: only the period table and the "Saisie du mois" form, with `@vue/test-utils` and `happy-dom`. The sync composable is mocked; the tests assert the patch `{ period, month, field, value }` handed to it on blur, and that inherited values are shown as such. Other components and the shadcn-vue ones are not tested.
- End to end: no Playwright in v1. Sign-in goes through real GitHub OAuth, and the two risky paths (formulas, save queue) are covered above.

## Golden record

The formula specs assert every computed cell of the sheet `Période-092025-092026` of "Suivi des charges de location (v2).xlsx" (ADR 0003 is superseded: no exception): per month and section the deltas, the bill, the landlord share and the tenant share, the column N totals, the balance (line 6) and the settlement amount and direction (line 5). Values are compared with `toBeCloseTo(expected, 6)`, so a different summation order cannot fail a test while a mistake under a cent still does.

The repo is public and the spreadsheet holds private consumption data (`*.xlsx` is gitignored), so the fixture is built from a randomized copy of the sheet, with Excel still computing the expected values:

1. `uv run scripts/randomize-golden.py` copies the workbook and writes randomized inputs into the copy, leaving the formulas untouched and forcing recalculation on open. The randomization is seeded, so a rerun gives the same values.
2. Open the copy in Excel and save it, so Excel recalculates every formula.
3. `uv run scripts/extract-golden.py` reads the inputs and the cached results from the copy and writes:
   - `tests/fixtures/golden-period.json`: the randomized period file, valid in the shape of `docs/period-file.md` (ADR 0005), water indexes in litres as integers;
   - `tests/fixtures/golden-expected.json`: every computed cell listed above, keyed by month and section, plus the period totals, the balance and the settlement.

The scripts are Python with `openpyxl`, declared in a PEP 723 header so `uv run` needs no virtual environment. Both scripts and both fixtures are committed; the workbook copy stays gitignored.

What the randomization changes:

- Each water and electricity meter's monthly delta, and each water softener purchase, is multiplied by a random factor between 0.85 and 1.15. Indexes are rebuilt from each meter's first previous index plus the new deltas, so they keep increasing, and rounded to whole litres (water) or whole kWh (electricity). Softener amounts keep two decimals.
- The internet bill is set to 30 every month.
- The heat pump maintenance is set to 169 in the months that already have one; the other months stay empty.

Everything else keeps its real value: unit prices and fees (public tariffs), reading dates, occupant counts, tariff modes, the monthly tenant bill advance and the advances received.

## Continuous integration

A GitHub Actions workflow runs on pull requests: `pnpm install --frozen-lockfile`, `pnpm audit signatures`, the tests with `vitest --coverage`, then `pnpm build`. Since `main` only moves through merged pull requests, this check guards what Netlify deploys; Netlify's build command only builds.

Coverage has no threshold. It is shown as a table in the workflow run's job summary, with no pull request comment.
