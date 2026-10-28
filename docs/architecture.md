# Architecture

Package manager, router and folder layout of the app, settled in `docs/grillings/2026-10-28-scaffold-choices/` (issue #4). None of these choices met the ADR bar: they are cheap to change before the scaffold grows.

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
