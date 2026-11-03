# Grilling round v03 — state management: Pinia or composables (issue #8)

## Settled in v02

- Q7: a 401 is split into two jobs: noticing it and marking the session expired (not the guard), and redirecting to `/sign-in?redirect=<path>` (the guard, kept as the only place holding that rule).
- Q7b (re-asks Q5): the period state calls the session state's `expire()` on a 401; the app shell watches the session and, when it turns signed-out, re-runs the current route with `router.replace(route.fullPath)` so the guard redirects. The dependency is one-way: periods > session.
- Q8: queued patches survive both a 401 and an explicit "Se déconnecter"; signing out with patches still queued asks for confirmation first. In-memory periods are cleared on sign-out and re-loaded after sign-in, with the queued patches re-applied.
- Q9: one period composable over `src/sync/`; the table and form tests mount it for real over a fixture period file and `vi.mock` `src/sync/`, asserting the patch passed to its enqueue function. `docs/architecture-tests.md` is reworded accordingly.
- Q10: recorded as a "State" section in `docs/architecture.md`, no ADR.

## Q11 - How the period state is exposed to the views

Issue #8 asks for this to be written down. Proposal, one module `src/composables/usePeriods.ts` holding the module-level state, with two functions over it:

```ts
// Collection-wide: the period list, the queue, the sync status.
usePeriods(): {
  periodIds: Readonly<Ref<string[]>>          // files in the data repo, e.g. ['2025-2026', '2026-2027']
  // sync status: see Q12
}

// One period, called by a page on setup with the [period] route param (Q6).
usePeriod(id: MaybeRefOrGetter<string>): {
  status: Readonly<Ref<'loading' | 'ready' | 'not-found' | 'error'>>
  file: Readonly<Ref<PeriodFile | undefined>>       // local copy, queued patches applied
  figures: Readonly<Ref<PeriodFigures | undefined>> // computed once (Q3)
  isClosed: Readonly<Ref<boolean>>
  setCell(month: string, field: string, value: unknown): void  // enqueues a patch (ADR 0004)
}
```

Views never write `file` directly: every edit goes through `setCell`, so it always becomes a patch. `id` accepts a getter so the page follows the route param when you go from one period to another.

➡️ Recommendation: accept this shape. Two functions in one module keep "one composable over `src/sync/`" (Q9) while letting a page ask only for its own period; read-only refs make the patch queue the single way to change a file.

### Answer to Q11

the shape makes sense

## Q12 - Sync status: app-wide or per period

The pending-count badge (functional breakdown Q19) and "Rafraîchir", refused while edits are queued (Q14b), both read the queue. Is the status exposed once for the whole app, or per period?

a. **App-wide**, from `usePeriods()`: `pendingCount`, and `syncState: 'idle' | 'saving' | 'offline' | 'error'`; the app shell shows the badge. "Rafraîchir" on a period is refused while that period has queued patches, read from a `pendingCountFor(id)`.
b. **Per period only**, from `usePeriod(id)`: each page shows its own badge.

➡️ Recommendation: a. The queue is one queue drained by one `drainQueue()` across all periods, so its state is app-wide and belongs in the shell, visible on `/periods` too. The per-period count is only needed to gate "Rafraîchir".

### Answer to Q12

I prefer App-wide so that if I move from one period to another, I can see the progress.

## Q13 - How the session is exposed

Proposal, `src/composables/useSession.ts`:

```ts
useSession(): {
  login: Readonly<Ref<string | null>>   // GitHub login, null when signed out
  isSignedIn: Readonly<Ref<boolean>>
  signIn(redirect?: string): void       // goes to github-auth-start
  signOut(): Promise<void>              // confirmation when patches are queued (Q8), then github-auth-logout
  expire(): void                        // called by the period state on a 401 (Q7b)
}
```

The guard reads `isSignedIn`; the app shell reads `login` and `isSignedIn` (Q7b's watcher). Clearing the periods on sign-out (Q4) is done by the app shell's watcher calling the period state, so `useSession` never imports the period state and the dependency stays one-way.

➡️ Recommendation: accept this shape, including the app shell (not `useSession`) clearing the periods, which is what keeps Q7b's "periods > session, never the reverse".

### Answer to Q13

Approved

## Q14 - Where the "signed in" hint comes from at start-up

The token is in an HttpOnly cookie the app cannot read (Q7). When the app starts, how does `useSession` know whether it is signed in?

a. **A hint persisted in IndexedDB**, as in the reference project (its ADR-008): set after a successful callback, cleared on sign-out or `expire()`. A stale hint is corrected by the first 401.
b. **A call at start-up** to a Netlify function answering who is signed in, before the first route is shown.

➡️ Recommendation: a. The app is offline-ready (functional breakdown Q19): opened offline on the phone, it must still show the periods and accept readings, which a start-up call cannot allow. The cost is a moment where the hint is stale, which Q7b already handles.

### Answer to Q14

Option A makes sense because of the PWA

## Q15 - Where the period actions live

"Estimer les relevés", "Clôturer la période" and "Nouvelle période" act on period files. Are they functions returned by the period composable?

a. **Yes**: `usePeriod(id)` also returns `estimateReadings()` and `close()`, which compute their values with `src/domain/` (estimates from the previous period, Q2) and write them as ordinary patches through the queue. `usePeriods()` returns `createPeriod(id, settings)`, which prefills from the previous period's figures.
b. **No**: each page computes the values with `src/domain/` and calls `setCell` for each of them.

➡️ Recommendation: a. Estimating needs the previous period, which only the period state can load (Q2), and keeping these actions in one place means the table and the form cannot write them differently. How `createPeriod` writes a new file (a create, not a patch on an existing file), and whether it works offline, is a sync question outside issue #8: I would leave it to F3.

### Answer to Q15

A
