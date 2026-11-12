# Architecture

Package manager, router and folder layout of the app, settled in `docs/grillings/2026-10-28-scaffold-choices/` (issue #4). None of these choices met the ADR bar: they are cheap to change before the scaffold grows. How shared state is held is in the "State" section below (issue #8), the message of each commit to the data repo in the "Data commits" section (issue #11), and how the period table is built is in the "Period table" section (issue #9).

What is tested, at which seam, and how the golden record fixture is produced: see `docs/architecture-tests.md`.

The environment variables the Netlify functions read, per environment, and how local development gets them: see `docs/environment-variables.md` (issue #10).

## Package manager and runtime

- pnpm, pinned through `"packageManager": "pnpm@12.19.0"` in `package.json` so Netlify's Corepack installs the same major as local development (Netlify's default is `10.x`). Bump it by hand when pnpm is upgraded locally.
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
│   ├── i18n/                       # fr.ts: every UI string, a plain typed object
│   ├── lib/                        # shadcn-vue's cn helper, safeRedirect, the gh_login cookie reader
│   ├── pages/                      # file-based routes
│   ├── router/
│   └── sync/                       # Vue-free: IndexedDB patch queue, drainQueue(), 409 rebase, SHA check
└── tests/
    ├── helpers/                    # spec helpers (Netlify event builder)
    └── fixtures/                   # sheet values, example period files
```

- `src/domain/` and `src/sync/` import nothing from Vue, enforced by the `app/vue-free` block of `eslint.config.js` (guarded by `eslint.config.spec.ts`). The UI reaches `src/sync/` through one composable.
- Imports are explicit: no auto-import plugin, so the lint rule above sees every Vue import.
- Types live with the code that owns them; there is no `src/types/`. Other folders (`utils/`, `services/`, ...) are created only when something needs them.
- Tests are colocated `*.spec.ts` files next to the code they test.
- UI strings are French and live in one plain typed object, `src/i18n/fr.ts`; components and composables import from it. No i18n library (decided in issue #28, replacing the earlier "inline in the components" line).
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

One global `router.beforeEach` guard requires a session on every route unless the page declares `meta: { public: true }`. Without a session, it redirects to `/sign-in?redirect=<path>`. A signed-in visitor who opens `/sign-in` is sent to `redirect` (or `/`), unless the page has an error to show. After the OAuth round trip, the callback function redirects straight to the asked page, so the sign-in page is only a button and the error messages.

## State

Settled in `docs/grillings/2026-11-03-state-management/` (issue #8). No ADR: a Pinia setup store's body is the composable's body, so the choice is cheap to reverse.

Shared state is held in **singleton composables**, as in `french-gas-stations-scraper` (its ADR-002): module-level refs declared outside `useX()`, so every caller shares them. No Pinia.

### Periods: `src/composables/usePeriods.ts`

One module, the only one reaching `src/sync/`, with two functions over the same module-level state.

```ts
// Collection-wide: the period list, the queue, the sync status.
usePeriods(): {
  periodIds: Readonly<Ref<string[]>>                 // files in the data repo, e.g. ['2025-2026', '2026-2027']
  listStatus: Readonly<Ref<'idle' | 'loading' | 'ready' | 'error'>>  // state of the period list request
  loadPeriodIds(): Promise<void>                     // lists the periods folder; a 401 calls the session's expire()
  pendingCount: Readonly<Ref<number>>                // whole queue, shown in the app shell
  syncState: Readonly<Ref<'idle' | 'saving' | 'offline' | 'error'>>
  pendingCountFor(id: string): number                // gates "Rafraîchir" on one period
  createPeriod(id: string, settings: PeriodSettings): Promise<void>  // prefills from the previous period
  clear(): void                                      // drops in-memory periods, keeps the queue
}

// One period, called by a page on setup with the [period] route param.
usePeriod(id: MaybeRefOrGetter<string>): {
  status: Readonly<Ref<'loading' | 'ready' | 'not-found' | 'error'>>
  file: Readonly<Ref<ReadonlyPeriodFile | undefined>>  // local copy, queued patches applied (F3); read-only in code
  sha: Readonly<Ref<string | undefined>>              // kept for later writes
  problems: Readonly<Ref<PeriodFileProblem[]>>        // the "Validation" rules the file breaks, as codes
  isReadOnly: Readonly<Ref<boolean>>                  // at least one problem: shown with a notice, never written
  refreshStatus: Readonly<Ref<'idle' | 'refreshing' | 'up-to-date' | 'updated' | 'failed'>>  // last "Rafraîchir"
  canRefresh: Readonly<Ref<boolean>>                  // ready and pendingCountFor(id) is zero
  refresh(): Promise<void>                           // compares the remote SHA, replaces the copy only if it differs
  figures: Readonly<Ref<PeriodFigures | undefined>>  // computed once from src/domain/
  isClosed: Readonly<Ref<boolean>>
  setCell(month: string, field: string, value: unknown): void  // enqueues a patch (ADR 0004)
  estimateReadings(): void                           // "Estimer les relevés", written as patches
  close(): void                                      // "Clôturer la période", written as a patch
}
```

- Issue #45 built the loading half of `usePeriod(id)`: `status`, `file`, `sha` (kept for later writes), `problems` and `isReadOnly`. The rest of the interface above arrives with F3 (#30). A file breaking a rule of "Validation" in `docs/period-file.md` (`src/domain/validatePeriodFile.ts`) is `ready` with `isReadOnly` true; JSON not shaped like a period file (no `periodName`, `settings` or `months`) is an `error`. A `ready` period is never fetched again; a `not-found` or `error` one is asked again on the next opening. The page is `src/pages/periods/[period].vue`, a placeholder until F5 (#32).
- Every period loaded so far is kept, keyed by its identifier, for the browser session. Periods are loaded lazily: "Estimer les relevés" and `createPeriod` load the previous period themselves.
- The computed figures are computed once per period, in a `computed()` over `src/domain/`. The table, the form and the settlement view only read them.
- Views never write `file`. Every edit, estimate or close goes through the queue as a patch.
- Each page asks for its period on setup and shows a loader while `status` is `loading`. The router has no loading step and there is no `<Suspense>` orchestrator. One page reads one period, so the sibling race of the reference project's ADR-013 does not arise.
- The sync status is app-wide, because one `drainQueue()` drains one queue across all periods. The app shell shows the pending-count badge on every route, so progress stays visible when you move from one period to another.

- The list comes from `listPeriodIds()` in `src/sync/periodsApi.ts`, which asks the proxy for `?path=periods`. A missing periods folder (GitHub 404) is an empty list, not an error. Until F7 (#34) builds `/periods`, the list is shown by `src/components/periods/PeriodList.vue` on the home page.

### Data proxy: `netlify/functions/github-api-proxy`

Issue #44. One function forwarding three operations to the GitHub Contents API of `DATA_REPO`, with the token from the `gh_token` cookie:

- `GET ?path=periods` lists the periods folder; `GET ?path=periods/2026-2027.json` gets one period file (content and SHA).
- `PUT { path, message, content, sha? }` puts one period file; without `sha` GitHub creates it. `GET` of one file is called by `usePeriod` (#45); no `PUT` caller until F3 (#30) and F7 (#34).
- Only paths under `periods/` are accepted (no empty, `.` or `..` segment, no backslash), and an `owner` or `repo` that is not `DATA_REPO` is refused with 403. The client does not need to send them.
- The branch is set from `DATA_BRANCH` on every request (`ref` on reads, `branch` on writes); a `ref` or `branch` sent by the client is ignored.
- No cookie, or GitHub answering 401 (the dead token cookie is then cleared): 401. GitHub's 404 and 409 are passed through. A missing or malformed `DATA_REPO` or `DATA_BRANCH`: 500 `{ "error": "misconfigured" }`.

### Session: `src/composables/useSession.ts`

```ts
useSession(): {
  login: Readonly<Ref<string | null>>   // GitHub login from the gh_login cookie, null when signed out
  isSignedIn: Readonly<Ref<boolean>>
  signIn(redirect?: string): void       // goes to github-auth-start
  signOut(): Promise<void>              // confirmation when patches are queued, then github-auth-logout
  expire(): void                        // called by the period state on a 401
  setPendingCountSource(source: () => number): void  // wired by the period state (F3)
}
```

- The "signed in" hint is the `gh_login` cookie: set by the callback next to the token, not HttpOnly, 8 hours, holding only the login (not a secret). The token sits in an HttpOnly cookie the app cannot read, and the app must open offline as a PWA, so it cannot ask a function at start-up; the guard reads the hint synchronously. It is only a hint (a visitor can set it), the token cookie is the truth, and a stale hint is corrected by the first 401. This replaces the IndexedDB hint of the original spec; F9 (#36) decides whether to keep the cookie or add an IndexedDB hint.
- `signOut()` clears the local state (including the `gh_login` cookie) even when the logout call fails offline; the HttpOnly token cookie then ends by itself after 8 hours.
- The sign-out confirmation reads a pending count that F3 wires through `setPendingCountSource()`; until then it is zero.
- The global `beforeEach` guard reads `isSignedIn` and is the only place holding the redirect rules between the app and `/sign-in`. The redirect rule for a path of this site exists twice, in `src/lib/safeRedirect.ts` and `netlify/functions/lib/redirect.ts`; sharing one pure file is planned with #39.

### Wiring between the two

- Dependencies are one-way: the period state imports the session state, never the reverse.
- On a 401 from the proxy, the period state calls `expire()`. It does not redirect.
- The app shell, mounted on every route, watches the session. When it turns signed-out, it re-runs the current route with `router.replace(route.fullPath)`, so the guard redirects. F3 adds the clearing of the periods held in memory.
- Queued patches survive a 401 and an explicit "Se déconnecter". Signing out while patches are queued asks for confirmation first ("N modifications pas encore enregistrées"). After the next sign-in, the periods are re-loaded from GitHub and the queued patches are re-applied on top.

### Sign-in round trip

The page and the login travel through the OAuth round trip as follows (issue #28):

1. The sign-in page sends the visitor to `github-auth-start?redirect=<path>`. Start stores a CSRF `state` and the requested path (only a path of this site: no scheme, no host, no `//`) in two short-lived `SameSite=Lax` cookies and redirects to GitHub.
2. `github-auth-callback` checks the `state`, exchanges the `code`, reads the signed-in `login` from `GET https://api.github.com/user`, and compares it, case-insensitively, with `ALLOWED_LOGINS`. Only an allowed login gets the `gh_token` cookie (HTTP-only, `SameSite=Strict`, `Secure` on https, 8 hours) and the `gh_login` hint cookie.
3. On success, the callback redirects to the asked path, or `/` when none was asked. On a refusal it redirects to `/sign-in?error=not-allowed|misconfigured|failed`. `failed` is the catch-all and covers a denied authorization, a `state` mismatch, a rejected `code` and an unreadable login.

## Data commits

Settled in `docs/grillings/2026-11-04-data-commit-messages/` (issue #11). No ADR: the format only affects future commits in the data repo.

Each GitHub Contents API `PUT` writes one period file, so it is one commit in `JeremieLitzler/tenant-bills-data`. A drain holding patches for two periods makes one commit per period file. Author and committer are the signed-in GitHub user; only the message is set by the app.

### Drain commits

The subject is `data(<period>): <n> edit(s) in <where>`:

- `<n>` is the number of patches in the `PUT`, that is the distinct cells written, removals (`value: null`) included. A retyped cell replaces its patch in the queue, so it counts once. After a 409 rebase, the count stays the number of patches sent, even if the other device had already written the same value. One edit is `1 edit`, otherwise `edits`.
- `<where>` names a single month by its `YYYY-MM` key, or counts several months (`12 months`). Settings patches add `settings`, after the months and joined with `and`.

```text
data(2026-2027): 1 edit in settings
data(2026-2027): 3 edits in 2026-10
data(2026-2027): 6 edits in 2 months
data(2026-2027): 4 edits in 2026-10 and settings
data(2026-2027): 7 edits in 2 months and settings
```

When more than one group is edited (several months, or months and settings), a plain-text body follows a blank line, with one `<group>: <n> edit(s)` line per month in period order, then one for settings:

```text
data(2026-2027): 7 edits in 2 months and settings

2026-10: 4 edits
2026-11: 2 edits
settings: 1 edit
```

- "Estimer les relevés" and "Clôturer la période" are ordinary patches: they drain with other edits and are counted like them. Closing alone reads `1 edit in settings`.
- A retried write after a 409 keeps exactly the same message; nothing marks the retry.

### Period creation commit

"Nouvelle période" creates the file with a `PUT` without `sha`, committed as `data(<period>): create period`, with no body. The values typed in the creation form (the monthly tenant bill advance, the heat pump maintenance split) are part of that commit and are not counted as edits. Edits typed afterwards go in later drains.

## Period table

Settled in `docs/grillings/2026-11-03-period-table-library/` (issue #9), after a prototype of three versions in `prototypes/period-table/`. No ADR: swapping the table's rendering later touches one component and its line definitions, not the period file or the queue.

### Approach

The period table (F5) uses shadcn-vue's plain `Table` components (`src/components/ui/table/`), with rows built by our own code. No TanStack Table.

- The table keeps the spreadsheet's orientation: one row per line of a section, one column per month (September to August), plus a label column. That is transposed from TanStack's row model, which expects one data object per row.
- The shape is fixed (about 60 lines, 12 months). Sorting, filtering, pagination and row selection, TanStack's main features, go unused.
- In the prototype, TanStack was harder for sections (two grouping features, a column that exists only to group by, then filtered out of every row) and simpler for nothing. A plain `<table>` with Tailwind only was no simpler than the shadcn-vue components either, so those stay for one table style across the app.

### Rows and cells

- The rows come from a list of line definitions: section, key, French label, input or computed, inherited or not, and tariff mode for the electricity lines. Each section starts with a header row.
- One cell component renders every month cell. It reads the period's file and computed figures from `usePeriod(id)` and writes only through `setCell` (see "State").
- A cell shows its value as typed, inherited (styled as such), derived (a previous index taken from the previous month), or computed (read-only). Implausible values carry a warning and are never blocked.
- A previous index is editable only in the first month, in a tariff-switch month for the registers of the new mode, and after "Compteur remplacé". Every cell of a closed period is read-only.
- Every electricity row is always shown. In a month in `base`, the HC and HP cells are empty, styled as not applicable and not editable, and the reverse in `hchp`. The period file keeps the other mode's keys, but no formula of that month reads them.

### Keyboard and mouse

The table has a selection mode and an edit mode, as in a spreadsheet. Neither shadcn-vue nor TanStack provides this: it is our own code.

- The table is a single Tab stop (ARIA grid pattern, `aria-activedescendant` on the table's container). Tab leaves it.
- Selection mode: the arrows move one cell up, down, left (previous month) or right (next month), stopping at the edges. They visit every cell, editable or not, and skip section header rows.
- Enter edits the selected cell, and does nothing on a read-only cell. Typing a character on an editable cell starts editing and replaces the value with it.
- Edit mode: Enter saves and moves to the next editable cell down in the same month, staying in edit mode. On the month's last editable cell, it saves and returns to selection mode. Escape restores the earlier value, enqueues nothing, and returns to selection mode. Arrow Left and Right move the text cursor.
- Mouse: a click selects a cell, a double click on an editable cell edits it, and leaving an editing cell any other way saves it (blur).
- Editing without changing the text enqueues nothing, so an inherited value stays inherited.

### Layout

- The month header and the label column are sticky. The label column has a fixed width.
- The table's scroll container has scroll padding matching the sticky header and label column, so the selected cell is never scrolled under them. Section titles are sticky inside their full-width header cell, so they stay visible when scrolling sideways.
- shadcn-vue's `Table.vue` renders a scroll container `div` around the `<table>`. Attributes fall through to that container, but its `class` prop goes to the `<table>`. The container's classes (height, scroll padding) are set by editing `Table.vue`, which is our code once added.
- The "Saisie du mois" form stays the phone screen for entering a month (Q20 of `docs/grillings/2026-10-26-functional-breakdown/`): touch is clumsy with selection and edit modes. On a phone, the table only needs to be readable. A CSS-only media query does that: a narrower label column with wrapped labels, each month column taking the rest of the width, and horizontal scrolling that snaps one month at a time.

### Prototype

`prototypes/period-table/` stays in the repo for a test on a phone. It is not part of the app: run it with `pnpm install` and `pnpm dev` from that folder, and switch versions with `?variant=shadcn|tanstack|native`.
