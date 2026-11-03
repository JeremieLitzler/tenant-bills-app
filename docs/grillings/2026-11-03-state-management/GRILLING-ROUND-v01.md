# Grilling round v01 — state management: Pinia or composables (issue #8)

## Starting point

Issue #8 asks how shared state is held in the Vue app, mainly the period state (F3: local copy, save queue, sync) shared by the period table, "Saisie du mois" and the settlement view, plus the auth state.

Facts gathered before this round:

- `french-gas-stations-scraper` removed Pinia (its ADR-002) and uses **singleton composables**: a module-level `ref()` declared outside `useX()`, so every caller shares it. Its ADR-009 forbids a composable from calling another composable inside its functions: components orchestrate. Its ADR-013 adds a page-level load orchestrator behind `<Suspense>` when sibling components share a singleton an async load can replace.
- This repo already assumes a composable at one seam: `docs/architecture.md` says "the UI reaches `src/sync/` through one composable", and `docs/architecture-tests.md` says the component tests mock "the sync composable" and assert the patch handed to it on blur.
- `src/domain/` and `src/sync/` are Vue-free; whatever holds the state is a thin reactive layer over them.
- Some actions read **another** period than the one on screen: "Estimer les relevés" reads the previous period's twelfth month, and "Nouvelle période" reads the previous period's settlement to prefill `monthlyTenantBillAdvance`.
- Auth is the reference project's: GitHub OAuth through Netlify functions, token in an HttpOnly cookie the browser cannot read.

## Q1 - Pinia or singleton composables

How is shared state held?

a. **Singleton composables**, as in `french-gas-stations-scraper`: module-level refs, a `usePeriods()` / `useSession()` function returning them. No dependency.
b. **Pinia setup stores** (`defineStore('periods', () => { ... })`): the body is written like a composable, but Pinia owns the instance, gives Vue devtools inspection (state, timeline of actions), and a test helper (`createTestingPinia`) that resets state between tests without `vi.resetModules()`.
c. Provide/inject from the app root.

➡️ Recommendation: a. The state is small (a few period files, one queue, one session), the app has one user and no SSR, and the reference project already shows the pattern and its tests working. It also matches the "one composable" wording already in `docs/architecture.md` and `docs/architecture-tests.md`. Pinia's main gain here would be devtools, which matters little once the queue logic is tested in the Vue-free `src/sync/`. Moving to Pinia later is cheap because a setup store's body is the composable's body.

### Answer to Q1

A

## Q2 - One period in memory, or several

Which period files does the shared state hold?

a. **Only the period in the URL**: navigating to another period replaces it. Actions that need the previous period fetch it on demand and do not keep it.
b. **Every period loaded so far, keyed by its identifier** (`2026-2027`): each is loaded lazily on first use and kept for the browser session; the views read the one in their URL.

➡️ Recommendation: b. "Estimer les relevés" and "Nouvelle période" read the previous period, and going back and forth between two periods should not re-fetch and re-check the SHA each time. Keeping a map also lets the save queue, which already carries `period` in each patch, apply patches to the right file.

### Answer to Q2

B

## Q3 - Where the computed figures are computed

The table, the form and the settlement view all show computed lines (deltas, bills, shares, balance, settlement). Where are they computed?

a. **Once, in the shared state**: for each period, a `computed()` calls the `src/domain/` functions on the period file and exposes the results; views only read them.
b. **In each view**: views read the raw period file and call the `src/domain/` functions themselves.

➡️ Recommendation: a. The three views show the same figures, so computing them once keeps them consistent and avoids recomputing the whole period in each view. Views stay display-only, which keeps the two tested components (table, form) simple.

### Answer to Q3

A

## Q4 - Auth state separate from the period state

Is the session (signed in or not, the GitHub login) held in its own state, apart from the periods?

a. **Separate**: a session state read by the global `beforeEach` guard and the app shell, knowing nothing about periods.
b. **Together**: one app state holding both the session and the periods.

➡️ Recommendation: a. The guard needs the session on every route, including `/sign-in` and `/periods`, where no period is loaded. Signing out then clears the periods explicitly, which is easy to see and to test.

### Answer to Q4

A

## Q5 - May one state call another

When the proxy answers 401 (session expired) during a sync, the session must be cleared and the user sent to `/sign-in`. Who does it?

a. **The period state calls the session state directly** on a 401.
b. **The components mediate**, as in the reference project's ADR-009: the period state reports the 401, and a component watches it and clears the session.

➡️ Recommendation: a. Here the 401 can surface from three views and from triggers that are not tied to a view (the queue drained on `online` or on visibility change), so mediating through components would mean duplicating the watch or adding an orchestrator for one line of logic. A direct, one-way dependency (periods > session, never the reverse) stays easy to follow.

### Answer to Q5

Is it not a guard responsibility?

## Q6 - Who triggers loading a period

When a route needs a period (`/periods/[period]`, its months, its settlement), who asks for it to be loaded?

a. **The page itself**, on setup: it asks the shared state for its period, which loads it once and returns the cached one afterwards, and the page shows a loader meanwhile.
b. **The router**: a `beforeEnter` / `beforeResolve` step loads the period before the page is shown.
c. **A page-level orchestrator behind `<Suspense>`**, as in the reference project's ADR-013.

➡️ Recommendation: a. Each of the three views is its own route, so the sibling race that ADR-013 solved does not arise: a single page reads a single period. Loading in the page keeps the router to its one auth guard, and an unknown period can show the "Période introuvable" handling planned in #15 inside the page.

### Answer to Q6

A
