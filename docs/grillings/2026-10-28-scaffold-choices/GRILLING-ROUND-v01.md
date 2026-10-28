# Grilling round v01 — scaffold choices: package manager, router, folder layout (issue #4)

## Settled before this session

From `docs/grillings/2026-10-26-functional-breakdown/GRILLING-SUMMARY.md`, the README and the ADRs:

- Stack: latest Vue 3 + Vite + TypeScript, shadcn-vue components, hosted on Netlify, Netlify functions for auth and the GitHub Contents API proxy, following `french-gas-stations-scraper`.
- Q15: code, keys, commits and docs in English; UI in French.
- Q19b / Q19c: installable PWA with `vite-plugin-pwa`, updates through a "Recharger" prompt.
- Q20: period table on large screens, "Saisie du mois" form on small screens, same queue.
- Q24: sign-in restricted to an allowlisted GitHub login.
- Q28: formulas are pure TypeScript functions, Vitest-tested against the sheet's values.
- Views listed by issue #4: period table, "Saisie du mois", period management, settlement view, sign-in.

Facts I looked up in `E:/Git/GitHub/french-gas-stations-scraper`:

- Package manager: npm (`package-lock.json`, `netlify.toml` runs `npm run build`).
- Router: `vue-router` 5 with file-based routing (`vue-router/vite` plugin, routes generated from `src/pages/`, `typed-router.d.ts`). Only two pages: `index.vue` and `mentions-legales.vue`.
- `src/` folders: `assets`, `components` (with `layout/` and `ui/` for shadcn), `composables`, `config`, `enums`, `i18n`, `lib`, `pages`, `plugins`, `router`, `services`, `types`, `utils`.
- Tests are colocated as `*.spec.ts` next to the file they test; `tests/fixtures/` holds test data.
- `netlify/functions/` has one folder per function (`github-auth-start`, `github-auth-callback`, `github-auth-logout`, `github-api-proxy`, plus `fetch-page` and `scheduled-price-history` specific to that app) and a shared `lib/`.
- One `package.json` at the repo root for both the app and the functions.

## Q1 - Package manager

Which package manager does the app use?

a. npm, like `french-gas-stations-scraper`: nothing to install on Netlify, the reference project's scripts and `netlify.toml` copy as they are.
b. pnpm: faster installs, stricter dependency resolution, needs `packageManager` in `package.json` (Netlify detects it via corepack).
c. Bun or Yarn.

➡️ Recommendation: a, npm. The app has one package and a modest dependency list, so pnpm's speed and strictness buy little, while staying on npm keeps every script, CI step and Netlify setting copyable from the reference project you already maintain.

### Answer to Q1

B, I have it install through scoop.

## Q2 - Router

Does the app use a router, and which one?

a. `vue-router` 5 with file-based routing from `src/pages/`, like the reference project: typed route names, one file per view.
b. `vue-router` 5 with a hand-written routes array in `src/router/index.ts`.
c. No router: one page, views switched by component state.

The five views argue for a router: a period and a month are natural URL parameters (a bookmark or a phone home-screen shortcut can open the current month's entry form directly), the browser back button works between the table and the settlement, and the OAuth callback needs a landing URL to come back to.

➡️ Recommendation: a, file-based `vue-router` 5. Same mechanism as the reference project, typed routes for free, and a URL per period and per month.

### Answer to Q2

A

## Q3 - App location in the repo

Where does the Vue app live?

a. At the repo root (`src/`, `package.json`, `vite.config.ts` next to `docs/` and `GLOSSARY.md`), like the reference project.
b. In a subfolder (`app/`), with the functions either inside it or beside it.

➡️ Recommendation: a, at the root. Netlify's defaults (`publish = "dist"`, `functions = "netlify/functions"`) work without a base directory, and there is only one app.

### Answer to Q3

A

## Q4 - One package or a workspace

Do the app and the Netlify functions share one `package.json`?

a. One `package.json` at the root for both, like the reference project; code shared between them (for example the allowlist check or the period file types) is imported by relative path.
b. A workspace with separate packages (`app`, `functions`, `shared`).

➡️ Recommendation: a, one package. The functions are a thin auth and proxy layer that does not need the period file's types, so a workspace would add tooling for almost no shared code.

### Answer to Q4

A

## Q5 - Where the pure domain code lives

Where do the formulas (Q28), the period file types, the inheritance resolution and the patch apply function live?

a. A dedicated `src/domain/` folder with no Vue import at all: plain TypeScript, tested with Vitest, imported by components and composables.
b. Spread across `src/utils/`, `src/types/` and `src/composables/`, like the reference project.

➡️ Recommendation: a, `src/domain/`. These functions are the heart of the app and are tested against the sheet's values; keeping them in one Vue-free folder makes that boundary visible and stops a component import from creeping in.

### Answer to Q5

A

## Q6 - Where the save queue and GitHub sync code lives

Where do the IndexedDB patch queue, `drainQueue()`, the 409 rebase and the SHA check on load (ADR 0004, Q14b) live?

a. A dedicated `src/sync/` folder, Vue-free like `src/domain/`, exposed to the UI through one composable.
b. In `src/services/` (the reference project's empty placeholder for this kind of code).
c. In `src/utils/` and `src/composables/`, like the reference project's `indexedDb.ts` and `useRemotePreferencesWrite.ts`.

➡️ Recommendation: a, `src/sync/`. The queue is the second piece of non-trivial logic after the formulas, with its own ADR; a named folder keeps it testable without mounting components.

### Answer to Q6

A

## Q7 - Test location

Where do tests live?

a. Colocated `*.spec.ts` next to the file they test, with test data (the sheet's computed values, example period files) in `tests/fixtures/`, like the reference project.
b. Everything under `tests/`, mirroring `src/`.

➡️ Recommendation: a, colocated with fixtures in `tests/fixtures/`. It matches the reference project and keeps each formula next to its test.

### Answer to Q7

A

## Q8 - Netlify functions layout

Which functions does v1 have, and how are they laid out?

a. `netlify/functions/` with one folder per function: `github-auth-start`, `github-auth-callback` (with the allowlist check of Q24), `github-auth-logout`, `github-api-proxy` (limited to the data repo of Q16), and a shared `netlify/functions/lib/`. The reference project's `fetch-page` and `scheduled-price-history` are not carried over.
b. The same functions as single files (`netlify/functions/github-auth-start.ts`) instead of folders.

➡️ Recommendation: a, the reference project's layout minus its two app-specific functions, so the auth and proxy code can be copied and then narrowed.

### Answer to Q8

A

Note: it feels that the `github-auth-start`, `github-auth-callback`, `github-auth-logout` and `github-api-proxy` could become a shared module between repositories. Record a grilling issue, while we keep duplicated code for now.
