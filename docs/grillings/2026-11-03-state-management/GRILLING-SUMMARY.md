# Grilling summary — state management: Pinia or composables (issue #8)

Session started 2026-11-03, rounds v01 to v03. Decision record written: the "State" section of `docs/architecture.md`. Also reworded: the component seam in `docs/architecture-tests.md`. No ADR and no new glossary term.

## Shared understanding

Shared state is held in **singleton composables**: module-level refs returned by `useX()`, the pattern `french-gas-stations-scraper` adopted when it removed Pinia. The state is small (a few period files, one queue, one session), the app has one user and no SSR, and `docs/architecture.md` and `docs/architecture-tests.md` already assumed "one composable" over `src/sync/`. Pinia would mainly bring devtools, and the risky logic is tested in the Vue-free `src/sync/` anyway. Moving to Pinia later stays cheap, since a setup store's body is the composable's body. That is why this is recorded in `docs/architecture.md`, not in an ADR.

**Periods.** One module, `src/composables/usePeriods.ts`, is the only one reaching `src/sync/`. It holds every period loaded so far, keyed by its identifier (`2026-2027`), because "Estimer les relevés" and "Nouvelle période" read the previous period, and going back and forth should not re-fetch. It exposes two functions. `usePeriods()` covers the whole collection: the period list, the queue's pending count and sync status, `createPeriod` and `clear`. `usePeriod(id)` covers one period: its load status, the local copy, the computed figures, whether it is closed, and `setCell`, `estimateReadings` and `close`. The figures are computed once per period over `src/domain/`, so the table, the form and the settlement view show the same numbers and only read them. Views never write the file: every change becomes a patch in the queue (ADR 0004). Each page asks for its own period on setup and shows a loader. Since one page reads one period, the reference project's `<Suspense>` orchestrator (its ADR-013) is not needed. The sync status is app-wide and shown in the app shell, because the queue is one queue across all periods, and you want to see the progress when you move from one period to another.

**Session.** `src/composables/useSession.ts` is separate from the periods. The guard needs it on every route, including those with no period loaded. It exposes `login`, `isSignedIn`, `signIn`, `signOut` and `expire`. The "signed in" hint is persisted in IndexedDB, because the token sits in an HttpOnly cookie the app cannot read. A start-up call is ruled out, since the PWA must open offline.

**The 401 changed the starting proposal.** v01 asked whether the period state may call the session state directly or whether components mediate (the reference project's ADR-009). You asked whether a 401 was not the guard's job. It is only half of it. The guard runs on navigation only, and a 401 can come from a background drain (`online`, visibility change) with no navigation at all. So the job is split. The period state notices the 401 and calls `expire()`. The app shell watches the session, clears the in-memory periods, and re-runs the current route, so the guard does the redirect, which keeps the `?redirect=` rule in one place. Dependencies stay one-way: periods > session.

**Queued patches survive a session end.** This covers a 401 and an explicit "Se déconnecter", which asks for confirmation when patches are queued. A meter reading typed offline must not be lost (ADR 0004), and the allowlist holds a single login. After the next sign-in, the periods are re-loaded and the patches re-applied.

**Tests.** The table and form tests mount the real period composable over a fixture period file and `vi.mock` `src/sync/`. They assert the patch handed to its enqueue function, so the inherited display is tested against real data, not hand-written figures.

## Decision index

- Q1 (v01): singleton composables, no Pinia.
- Q2 (v01): every period loaded so far is kept, keyed by its identifier, loaded lazily.
- Q3 (v01): the computed figures are computed once per period in the shared state; views only read them.
- Q4 (v01): the session state is separate from the periods; sign-out clears the periods explicitly.
- Q6 (v01): each page asks for its period on setup and shows a loader; no router loading step, no `<Suspense>` orchestrator.
- Q7 (v02): a 401 splits into noticing it (period state) and redirecting (the guard, sole holder of the redirect rule).
- Q7b (v02): the period state calls `expire()` on a 401; the app shell watches the session, clears the periods and re-runs the current route so the guard redirects; dependency periods > session only.
- Q8 (v02): queued patches survive a 401 and an explicit sign-out; sign-out with queued patches asks for confirmation; periods are re-loaded and patches re-applied after sign-in.
- Q9 (v02): component tests use the real period composable over a fixture and mock `src/sync/`.
- Q10 (v02): recorded in `docs/architecture.md`, no ADR.
- Q11 (v03): `src/composables/usePeriods.ts` exposes `usePeriods()` and `usePeriod(id)` with read-only refs; edits only through `setCell`.
- Q12 (v03): sync status (`pendingCount`, `syncState`) is app-wide, shown in the app shell; `pendingCountFor(id)` gates "Rafraîchir".
- Q13 (v03): `useSession()` exposes `login`, `isSignedIn`, `signIn`, `signOut`, `expire`; the app shell, not `useSession`, clears the periods.
- Q14 (v03): the "signed in" hint is persisted in IndexedDB, because the PWA must open offline.
- Q15 (v03): `estimateReadings()` and `close()` belong to `usePeriod(id)` and write patches; `createPeriod()` belongs to `usePeriods()`.

Superseded: Q5 (v01), answered with a question and replaced by Q7 and Q7b.

## Decided without grilling (object if any is wrong)

- `usePeriods()` also exposes `clear()`, which drops the in-memory periods but keeps the queue. The app shell's watcher needs it to apply Q4 and Q13. It was not in the Q11 proposal.
  - OK
- `docs/architecture.md`'s introduction now points to the new "State" section, since it said only issue #4.
  - OK
- How `createPeriod` writes a new file (a create, not a patch on an existing file), and whether it works offline, is left to F3 (Q15). No issue was created for it. Say so if you want one.
  - OK
- No `GLOSSARY.md` entry was added. "Session", "queue" and "sync status" are implementation terms, not domain language.
  - OK
