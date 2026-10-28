# Grilling summary — scaffold choices: package manager, router, folder layout (issue #4)

Session started 2026-10-28, rounds v01 to v02. Decision record written: `docs/architecture.md`. Follow-up issue created: #14.

## Shared understanding

The F10 scaffold follows `french-gas-stations-scraper` wherever it can, and differs in three places on purpose.

The first difference is the package manager. The app uses pnpm, which you already have through scoop, rather than the reference project's npm. Netlify builds with its default pnpm `10.x` unless told otherwise, while you run `12.16.1` locally, so the version is pinned with the `packageManager` field to keep the lockfile format the same on both sides. Node is pinned to `24` with a `.node-version` file.

The second difference is that the code which matters most gets its own Vue-free folders. The formulas, the period file types, inheritance and the patch apply function go in `src/domain/`. The IndexedDB patch queue, `drainQueue()`, the 409 rebase and the SHA check go in `src/sync/`. Both are tested with colocated Vitest specs, without mounting components. The reference project spreads this kind of code across `utils/`, `types/` and `composables/`, and keeps four empty folders. Here, `src/` starts lean and a folder is added when something needs it.

The third difference is routing. File-based `vue-router` 5 is kept, but this app has five real views instead of two pages. Each view gets one English path, and the parameters reuse the period file's identifiers (`2026-2027`, `2026-10`). The table and "Saisie du mois" are separate routes, both open on any screen size. Q20 of the functional breakdown (table on large screens, form on small screens) only decides where `/` lands. A single global guard protects every route except the public sign-in.

Everything else copies the reference project: the app at the repo root, one `package.json` for the app and the functions, one folder per Netlify function with a shared `lib/` (auth start, callback, logout, API proxy), colocated tests with `tests/fixtures/`. The four functions are duplicated for now. Whether they should become a module shared between repositories is left to issue #14.

None of this met the ADR bar, because each choice is cheap to reverse before the scaffold grows. It is recorded in `docs/architecture.md`.

## Decision index

- Q1 (v01): pnpm.
- Q2 (v01): `vue-router` 5 with file-based routing from `src/pages/`.
- Q3 (v01): the app sits at the repo root.
- Q4 (v01): one `package.json` for the app and the functions; no workspace.
- Q5 (v01): domain code (formulas, period file types, inheritance, patch apply) in a Vue-free `src/domain/`.
- Q6 (v01): queue and GitHub sync code in a Vue-free `src/sync/`, exposed through one composable.
- Q7 (v01): colocated `*.spec.ts`, test data in `tests/fixtures/`.
- Q8 (v01): one folder per function (`github-auth-start`, `github-auth-callback`, `github-auth-logout`, `github-api-proxy`) plus `lib/`; code duplicated from the reference project for now.
- Q9 (v02): pnpm pinned with `"packageManager": "pnpm@12.16.1"`, bumped by hand.
- Q10 (v02): Node pinned to `24` in `.node-version`.
- Q11 (v02): the shared-module grilling issue is created in this repo, labelled `needs-triage` (issue #14).
- Q12 (v02): URL paths in English.
- Q13 (v02): routes `/sign-in`, `/`, `/periods`, `/periods/[period]`, `/periods/[period]/months/[month]`, `/periods/[period]/settlement`.
- Q14 (v02): table and form are separate routes reachable on any screen size; only `/` picks by screen size.
- Q15 (v02): one global `beforeEach` guard; public pages declare `meta: { public: true }`; redirect to `/sign-in?redirect=<path>`.
- Q16 (v02): `src/` starts with `assets/`, `components/` (`ui/`, `layout/`), `composables/`, `domain/`, `lib/`, `pages/`, `router/`, `sync/`; no `types/`, `utils/` or other empty folders.
- Q17 (v02): French UI strings inline, no i18n library.
- Q18 (v02): recorded in `docs/architecture.md`, no ADR.

Superseded: none.

## Decided without grilling (object if any is wrong)

- `docs/architecture.md` was not linked from the README. The link is now added.
  - Jeremie says: Go for it
- What an unknown `[period]` or `[month]` in the URL shows (for example a "Période introuvable" message with a link to `/periods`) was not grilled. I left it to F10.
  - Jeremie says: Plan an issue to handle 404 navigation errors.
  - Created as #15.
- The page the OAuth callback function redirects to after sign-in was not grilled. I assumed it is the `redirect` path carried through the flow (Q15), and `/` when there is none.
  - Jeremie says: Correct.

## Paste-ready for issue #4

> Settled in `docs/grillings/2026-10-28-scaffold-choices/`, recorded in `docs/architecture.md` (no ADR: every choice is cheap to reverse at this stage).
>
> - **Package manager**: pnpm, pinned with `"packageManager": "pnpm@12.16.1"` so Netlify does not fall back to its default `10.x`; Node pinned to `24` in `.node-version`. I picked pnpm over the reference project's npm because I already use it through scoop.
> - **Router**: `vue-router` 5 with file-based routing from `src/pages/`, English paths: `/sign-in`, `/` (redirects to the current period's table on a large screen or its current month's form on a small one), `/periods`, `/periods/[period]`, `/periods/[period]/months/[month]`, `/periods/[period]/settlement`. A global guard protects everything except `/sign-in`.
> - **Layout**: app at the repo root, one `package.json`. `src/` holds `assets/`, `components/` (`ui/`, `layout/`), `composables/`, `domain/` and `sync/` (both Vue-free), `lib/`, `pages/`, `router/`. Tests are colocated, fixtures in `tests/fixtures/`. `netlify/functions/` has `github-auth-start`, `github-auth-callback`, `github-auth-logout`, `github-api-proxy` and `lib/`, duplicated from `french-gas-stations-scraper` for now; a shared module is to be grilled in #14.
