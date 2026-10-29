# Grilling round v01 — v1 test scope (issue #6)

## Settled before this session

From the earlier grilling summaries, `docs/architecture.md`, the ADRs and the comment on issue #6:

- Functional breakdown Q28: formulas are pure TypeScript functions in `src/domain/`, Vitest-tested against the sheet's computed values.
- Period file grilling Q35: ADR 0003 is superseded. The formula tests expect the fixed sheet's cached values with no exception.
- Period file grilling: the golden record is `Période-092025-092026` (twelve months, corrected readings). The test input is a period file in the shape of `docs/period-file.md` (ADR 0005), water indexes in litres as integers. Where it lives and how it is produced is decided here.
- Scaffold grilling Q7: tests are colocated `*.spec.ts` files; test data goes in `tests/fixtures/`.
- `src/domain/` (formulas, period file types, inheritance, patch apply) and `src/sync/` (IndexedDB patch queue, `drainQueue()`, 409 rebase, SHA check) import nothing from Vue. The UI reaches `src/sync/` through one composable.
- The four Netlify functions are duplicated from `french-gas-stations-scraper`.

Facts I looked up:

- `french-gas-stations-scraper` uses Vitest 4 with `happy-dom`, `@vue/test-utils` for component specs (9 components) and composable specs (8 composables), and a spec next to each Netlify function and each `netlify/functions/lib/` module. No Playwright, no end-to-end tests.
- Its CI is `.github/workflows/pr-build.yml`: on pull requests it runs `npm ci`, `npm audit signatures`, `npm run test`, then `npm run build`. Netlify's build command is only `npm run build` (tests do not run on Netlify).
- In this repo, `*.xlsx` is gitignored with the comment "Source spreadsheet with private consumption data". The repo is **public**. `docs/examples/2026-2027.json` already holds real readings for 2026-2027.
- No `package.json`, `src/` or `tests/` exist yet.

## Q1 - Domain modules under Vitest

Every module in `src/domain/` gets a colocated `*.spec.ts` run by Vitest in the Node environment (no DOM): the formulas, the inheritance of values from the previous month, and the application of a patch to a period file. These are pure functions, tested through their exported functions only.

Is that the scope for `src/domain/`?

➡️ Recommendation: yes. They are the core of the app, pure, cheap to test, and the golden record gives them an oracle.

### Answer to Q1

Yes

## Q2 - How the golden record fixture is produced

The formula specs need the 2025-2026 period file as input. The `.xlsx` is gitignored, so nothing that runs in CI can read it. Options:

- a) Hand-write the period file JSON once from the sheet, and commit it.
- b) Write a one-off local script that reads the `.xlsx` and writes the period file JSON; commit the JSON, and commit the script under `scripts/` so the fixture can be regenerated if the sheet changes again.
- c) Same as b, but do not commit the script (run once, thrown away).

➡️ Recommendation: b. The sheet has changed once already (the 2026-10-28 export); twelve months by six sections is a lot of typing to redo by hand, and a committed script makes the provenance of every number traceable.

### Answer to Q2

B

## Q3 - Committing real consumption data in a public repo

The `.xlsx` is gitignored as "private consumption data", yet the golden record fixture would put the 2025-2026 readings, prices and advances in the public repo (as `docs/examples/2026-2027.json` already does for 2026-2027). Options:

- a) Commit the real values as they are.
- b) Commit them but leave out anything you consider private (tell me what).
- c) Do not commit the fixture: keep it gitignored, run the golden record specs only locally, and skip them in CI when the file is absent.

➡️ Recommendation: a, since `docs/examples/2026-2027.json` already publishes the same kind of numbers, the fixture holds no names or addresses, and c would leave CI blind to formula regressions. But this is your data: confirm.

### Answer to Q3

Randomize the reading and input value a little in the Excel to produce new values

## Q4 - Which computed values the formula specs assert

The sheet caches many computed cells. Options:

- a) Every computed cell: per month and per section the deltas, the bill, the landlord share and the tenant share, plus the totals in column N, the balance (line 6) and the settlement amount and direction (line 5).
- b) Only the tenant share per section per month, the balance and the settlement.
- c) Only the end results: the balance and the settlement.

➡️ Recommendation: a. When a total is wrong, a per-cell assertion points at the exact formula and month; b and c only say "something is off".

### Answer to Q4

A

## Q5 - Numeric tolerance against the sheet's cached values

The sheet's cached values are full-precision floats; the app's TypeScript may sum in a different order and differ in the last bits. Options:

- a) Exact equality.
- b) Close to 1e-6 (`toBeCloseTo(expected, 6)`).
- c) Equal once rounded to the cent.

➡️ Recommendation: b. Exact equality would fail on summation order alone; rounding to the cent could hide a real mistake smaller than half a cent that accumulates over twelve months.

### Answer to Q5

B

## Q6 - Seam for the `src/sync/` tests

The save queue (ADR 0004) talks to IndexedDB and to the GitHub Contents API through the proxy. Options:

- a) Vitest with `fake-indexeddb` for IndexedDB, and an in-memory fake of the GitHub Contents API stubbed at `fetch` (it keeps a file and its SHA, answers 409 when the SHA is stale). Tests drive `drainQueue()` and assert on the fake's final file.
- b) Same IndexedDB, but mock the module that wraps the GitHub calls instead of `fetch`, asserting on the calls made.
- c) Split: test the rebase logic as pure functions only, and leave IndexedDB and the network untested.

➡️ Recommendation: a. The behaviour that matters (one `PUT` at a time, rebase and retry once on 409, the queued edit wins) is only visible end to end through the queue; a fake at `fetch` keeps the wrapper module free to change.

### Answer to Q6

A

## Q7 - Netlify function specs

The four functions are duplicated from `french-gas-stations-scraper`, which has a spec next to each one and next to each `lib/` module. Should their specs be copied along with them and kept passing (adapted to the data repo and the login allowlist)?

➡️ Recommendation: yes. They are already written, and the allowlist check in `github-auth-callback` and the repo restriction in `github-api-proxy` are the security boundary of the app.

### Answer to Q7

Yes

## Q8 - Component tests

Should v1 have component tests (`@vue/test-utils` with `happy-dom`, as in the reference project) for the Vue components? Options:

- a) None in v1.
- b) Only the two input views: the period table and the "Saisie du mois" form (a blur queues the right patch, inherited values show as such).
- c) Every non-shadcn component, as the reference project does.

➡️ Recommendation: b. The domain and the queue carry the logic and are covered by Q1 and Q6; the remaining risk is the wiring between a field's blur and the patch it queues, which only these two views do.

### Answer to Q8

B

## Q9 - End-to-end tests

Should v1 have Playwright end-to-end tests?

➡️ Recommendation: no. The reference project has none, sign-in goes through real GitHub OAuth (hard to run in CI), and Q6 and Q8 cover the two risky paths. Revisit if a regression slips past them.

### Answer to Q9

no

## Q10 - Where the tests run

Options:

- a) A GitHub Actions workflow on pull requests, as in the reference project: `pnpm install --frozen-lockfile`, `pnpm audit signatures`, `pnpm test`, `pnpm build`. Netlify only builds.
- b) Same, plus run the tests in Netlify's build command so a failing test blocks the deploy too.
- c) Locally only, no CI.

➡️ Recommendation: a. `main` only moves through merged pull requests, so a required PR check already guards what Netlify deploys, without slowing every deploy.

### Answer to Q10

A

## Q11 - Coverage threshold

Should v1 enforce a coverage threshold (for example a minimum percentage on `src/domain/` and `src/sync/`) that fails the run?

➡️ Recommendation: no. Keep `vitest --coverage` available as a script, as in the reference project, but without a threshold; the golden record and the queue scenarios say more than a percentage.

### Answer to Q11

No for now, but keep `vitest --coverage` in the CI workflow as an information to view at all time.
