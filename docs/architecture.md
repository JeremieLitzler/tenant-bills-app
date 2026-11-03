# Architecture

Package manager, router and folder layout of the app, settled in `docs/grillings/2026-10-28-scaffold-choices/` (issue #4). None of these choices met the ADR bar: they are cheap to change before the scaffold grows. How shared state is held is in the "State" section below (issue #8).

What is tested, at which seam, and how the golden record fixture is produced: see `docs/architecture-tests.md`.

## Package manager and runtime

- pnpm, pinned through `"packageManager": "pnpm@12.16.1"` in `package.json` so Netlify's Corepack installs the same major as local development (Netlify's default is `10.x`). Bump it by hand when pnpm is upgraded locally.
- Node pinned with a `.node-version` file at the root, set to `24`.
- This differs from `french-gas-stations-scraper` (npm): its scripts and `netlify.toml` are adapted to `pnpm run ...`.

## Repository layout

One `package.json` at the repo root for the app and the Netlify functions; no workspace.

```
/
├── .node-version
├── package.json
├── netlify.toml
├── vite.config.ts
├── GLOSSARY.md
├── docs/
├── netlify/
│   └── functions/
│       ├── github-auth-start/
│       ├── github-auth-callback/   # refuses logins outside the allowlist
│       ├── github-auth-logout/
│       ├── github-api-proxy/       # limited to the data repo
│       └── lib/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/                 # app shell
│   │   └── ui/                     # shadcn-vue
│   ├── composables/
│   ├── domain/                     # Vue-free: formulas, period file types, inheritance, patch apply
│   ├── lib/                        # shadcn-vue's cn helper
│   ├── pages/                      # file-based routes
│   ├── router/
│   └── sync/                       # Vue-free: IndexedDB patch queue, drainQueue(), 409 rebase, SHA check
└── tests/
    └── fixtures/                   # sheet values, example period files
```

- `src/domain/` and `src/sync/` import nothing from Vue. The UI reaches `src/sync/` through one composable.
- Types live with the code that owns them; there is no `src/types/`. Other folders (`utils/`, `services/`, ...) are created only when something needs them.
- Tests are colocated `*.spec.ts` files next to the code they test.
- UI strings are French and written inline in the components; no i18n library.
- The four functions are duplicated from `french-gas-stations-scraper` for now; a shared module is to be grilled in issue #14.

## Routing

`vue-router` 5 with file-based routing from `src/pages/`. Paths are in English, like the rest of the code.

- `/sign-in`: sign-in page, public.
- `/`: redirects to the current period (the one containing today's date): its table on a large screen, the current month's "Saisie du mois" on a small one. Goes to `/periods` when no period exists.
- `/periods`: period management (list, "Nouvelle période").
- `/periods/[period]`: period table, `[period]` as `2026-2027`.
- `/periods/[period]/months/[month]`: "Saisie du mois", `[month]` as `2026-10`, the period file's own month identifier.
- `/periods/[period]/settlement`: settlement view.

The table and the form are both reachable on any screen size; only the `/` redirect picks by screen size.

One global `router.beforeEach` guard requires a session on every route unless the page declares `meta: { public: true }`. Without a session, it redirects to `/sign-in?redirect=<path>` and returns there after sign-in.

## State

Settled in `docs/grillings/2026-11-03-state-management/` (issue #8). No ADR: a Pinia setup store's body is the composable's body, so the choice is cheap to reverse.

Shared state is held in **singleton composables**, as in `french-gas-stations-scraper` (its ADR-002): module-level refs declared outside `useX()`, so every caller shares them. No Pinia.

### Periods: `src/composables/usePeriods.ts`

One module, the only one reaching `src/sync/`, with two functions over the same module-level state.

```ts
// Collection-wide: the period list, the queue, the sync status.
usePeriods(): {
  periodIds: Readonly<Ref<string[]>>                 // files in the data repo, e.g. ['2025-2026', '2026-2027']
  pendingCount: Readonly<Ref<number>>                // whole queue, shown in the app shell
  syncState: Readonly<Ref<'idle' | 'saving' | 'offline' | 'error'>>
  pendingCountFor(id: string): number                // gates "Rafraîchir" on one period
  createPeriod(id: string, settings: PeriodSettings): Promise<void>  // prefills from the previous period
  clear(): void                                      // drops in-memory periods, keeps the queue
}

// One period, called by a page on setup with the [period] route param.
usePeriod(id: MaybeRefOrGetter<string>): {
  status: Readonly<Ref<'loading' | 'ready' | 'not-found' | 'error'>>
  file: Readonly<Ref<PeriodFile | undefined>>        // local copy, queued patches applied
  figures: Readonly<Ref<PeriodFigures | undefined>>  // computed once from src/domain/
  isClosed: Readonly<Ref<boolean>>
  setCell(month: string, field: string, value: unknown): void  // enqueues a patch (ADR 0004)
  estimateReadings(): void                           // "Estimer les relevés", written as patches
  close(): void                                      // "Clôturer la période", written as a patch
}
```

- Every period loaded so far is kept, keyed by its identifier, for the browser session. Periods are loaded lazily: "Estimer les relevés" and `createPeriod` load the previous period themselves.
- The computed figures are computed once per period, in a `computed()` over `src/domain/`. The table, the form and the settlement view only read them.
- Views never write `file`. Every edit, estimate or close goes through the queue as a patch.
- Each page asks for its period on setup and shows a loader while `status` is `loading`. The router has no loading step and there is no `<Suspense>` orchestrator. One page reads one period, so the sibling race of the reference project's ADR-013 does not arise.
- The sync status is app-wide, because one `drainQueue()` drains one queue across all periods. The app shell shows the pending-count badge on every route, so progress stays visible when you move from one period to another.

### Session: `src/composables/useSession.ts`

```ts
useSession(): {
  login: Readonly<Ref<string | null>>   // GitHub login, null when signed out
  isSignedIn: Readonly<Ref<boolean>>
  signIn(redirect?: string): void       // goes to github-auth-start
  signOut(): Promise<void>              // confirmation when patches are queued, then github-auth-logout
  expire(): void                        // called by the period state on a 401
}
```

- The "signed in" hint is persisted in IndexedDB, as in the reference project (its ADR-008). The token sits in an HttpOnly cookie the app cannot read, and the app must open offline as a PWA, so it cannot ask a function at start-up. A stale hint is corrected by the first 401.
- The global `beforeEach` guard reads `isSignedIn` and is the only place holding the redirect to `/sign-in?redirect=<path>`.

### Wiring between the two

- Dependencies are one-way: the period state imports the session state, never the reverse.
- On a 401 from the proxy, the period state calls `expire()`. It does not redirect.
- The app shell, mounted on every route, watches the session. When it turns signed-out, it calls `usePeriods().clear()` and re-runs the current route with `router.replace(route.fullPath)`, so the guard redirects.
- Queued patches survive a 401 and an explicit "Se déconnecter". Signing out while patches are queued asks for confirmation first ("N modifications pas encore enregistrées"). After the next sign-in, the periods are re-loaded from GitHub and the queued patches are re-applied on top.
