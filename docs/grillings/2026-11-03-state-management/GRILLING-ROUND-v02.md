# Grilling round v02 — state management: Pinia or composables (issue #8)

## Settled in v01

- Q1: shared state is held in singleton composables (module-level refs returned by `useX()`), as in `french-gas-stations-scraper`; no Pinia.
- Q2: the period state keeps every period loaded so far, keyed by its identifier (`2026-2027`), loaded lazily and kept for the browser session.
- Q3: the computed figures are computed once per period in the shared state (a `computed()` over the `src/domain/` functions); views only read them.
- Q4: the session has its own state, apart from the periods; signing out clears the periods explicitly.
- Q6: each page asks the shared state for its period on setup and shows a loader meanwhile; no router loading step, no `<Suspense>` orchestrator.

## Reopened

- Q5 was answered with a question ("Is it not a guard responsibility?"). Q7 answers it, and Q7b re-asks the decision with what Q7 rules out.

## Q7 - Is a 401 the guard's responsibility?

Partly. The global `beforeEach` guard runs **only on navigation**: it decides whether a route may be entered, from what the session state says. It cannot see a 401, for two reasons:

- The token lives in an HttpOnly cookie, so the browser cannot read whether it has expired. The session state only holds a "signed in" hint (the reference project keeps it in IndexedDB). A 401 from the proxy is the only way the app learns the session is gone.
- A 401 can arrive with no navigation at all: the queue is drained on blur, on `online` and on visibility change, while the user stays on the same page. Nothing would run the guard.

So two jobs are involved: **noticing** the 401 and updating the session state (not a guard job), and **redirecting** to `/sign-in?redirect=<path>` (a guard job, if something re-runs it). Q7b picks how they connect.

➡️ Recommendation: accept this split: the guard keeps the redirect rule in one place, and whatever notices the 401 only marks the session as expired.

### Answer to Q7

Approved Recommendation

## Q7b - Who marks the session expired and who redirects (re-asks Q5)

Given Q7, which wiring?

a. **The period state calls the session state** (`expire()`) on a 401. The app shell watches the session and, when it turns signed-out, re-runs the current route (`router.replace(route.fullPath)`), so the guard does the redirect with its usual `?redirect=` rule.
b. Same as a., but `expire()` itself calls the router. The redirect rule then exists in two places (guard and session).
c. **The components mediate** (reference ADR-009): the period state exposes a "401 happened" flag, and each of the three views watches it and clears the session. Background drains outside a view need an extra watcher anyway.

➡️ Recommendation: a. The dependency stays one-way (periods > session), the redirect rule stays in the guard only, and the one watcher sits in the app shell, which is mounted on every route.

### Answer to Q7b

A

## Q8 - What happens to queued patches on a 401 or a sign-out

The save queue lives in IndexedDB. When the session ends, does it survive?

a. **Kept**: on a 401, the patches stay queued and are drained after the next sign-in. An explicit "Se déconnecter" with patches still queued asks for confirmation ("N modifications pas encore enregistrées") and keeps them too.
b. **Kept on a 401, discarded on an explicit sign-out** (after the same confirmation).
c. **Discarded** in both cases.

➡️ Recommendation: a. A 401 is not the user's choice, and a meter reading typed offline must not be lost (the reason for ADR 0004). The allowlist holds a single login, so the patches cannot end up written under someone else's name. In-memory periods are still cleared on sign-out (Q4) and re-loaded from GitHub after sign-in, with the queued patches re-applied on top.

### Answer to Q8

A

## Q9 - Where the component tests cut

`docs/architecture-tests.md` says the table and form tests "mock the sync composable" and assert the patch handed to it on blur, and that "inherited values are shown as such". With Q3, the same period composable now also exposes the computed figures, including inheritance. Mocking it whole means each component test hand-writes the figures, and the inherited display is then tested against a fake.

a. **Keep one period composable; mock `src/sync/` under it.** The tests mount the component with the real composable over a fixture period file, `vi.mock` the `src/sync/` module, and assert the patch passed to its enqueue function. Inheritance and figures are the real ones. The wording in `docs/architecture-tests.md` changes from "the sync composable is mocked" to "`src/sync/` is mocked".
b. **Mock the whole period composable**, as written today, and give each test hand-written figures.
c. **Split into two composables**: one reading the period and its figures (real in tests), one taking edits (mocked).

➡️ Recommendation: a. It keeps "one composable over `src/sync/`" from `docs/architecture.md`, tests the inherited display against real data, and the mocked seam (`src/sync/`) is already Vue-free and has its own specs.

### Answer to Q9

A

## Q10 - Where the decision is recorded

a. **A "State" section in `docs/architecture.md`**, like the scaffold choices: no ADR.
b. **An ADR** in `docs/adr/`.

➡️ Recommendation: a. Q1's choice is cheap to reverse (a setup store's body is the composable's body), so it misses the ADR bar's "hard to reverse". The 401 wiring and the queue surviving a sign-out are not surprising once ADR 0004 is known.

### Answer to Q10

A
