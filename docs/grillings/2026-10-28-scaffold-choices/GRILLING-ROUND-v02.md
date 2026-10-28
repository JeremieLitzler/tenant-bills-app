# Grilling round v02 — scaffold choices: package manager, router, folder layout (issue #4)

## Settled in v01

- Q1: pnpm, not npm. You already have it installed through scoop. This differs from `french-gas-stations-scraper`, so its scripts and `netlify.toml` need adapting (`pnpm run build`).
- Q2: `vue-router` 5 with file-based routing from `src/pages/`, like the reference project.
- Q3: the Vue app sits at the repo root, next to `docs/` and `GLOSSARY.md`.
- Q4: one `package.json` at the root for the app and the functions; no workspace.
- Q5: formulas, period file types, inheritance resolution and the patch apply function live in `src/domain/`, with no Vue import.
- Q6: the IndexedDB patch queue, `drainQueue()`, the 409 rebase and the SHA check live in `src/sync/`, Vue-free, exposed through one composable.
- Q7: tests are colocated `*.spec.ts`; test data goes in `tests/fixtures/`.
- Q8: `netlify/functions/` holds one folder per function (`github-auth-start`, `github-auth-callback`, `github-auth-logout`, `github-api-proxy`) and a shared `lib/`; `fetch-page` and `scheduled-price-history` are not carried over. Your note: these four functions could become a module shared between repositories. We keep duplicated code for now and record a grilling issue (see Q11).

Facts I looked up for this round:

- Netlify runs `pnpm install` when it finds `pnpm-lock.yaml`. Without a `packageManager` field it uses its default pnpm, `10.x`. The `packageManager` field (e.g. `"pnpm@12.16.1"`) makes Corepack install that exact version; semver ranges are not accepted.
- Your local versions: pnpm `12.16.1`, Node `v24.22.1`.
- The period file names a month `"YYYY-MM"` (`docs/period-file.md`), and a period `YYYY-YYYY`.
- In the reference project, `src/config`, `src/enums`, `src/i18n` and `src/plugins` are empty. `src/types` holds the app's types. `src/components/layout/` holds `GuestLayout` and `AppFooter`.

## Q9 - Pinning the pnpm version

How is the pnpm version pinned, so that Netlify does not build with its default `10.x` while you develop on `12.x`?

a. A `packageManager` field in `package.json` set to your local version (`"pnpm@12.16.1"`), bumped by hand when you upgrade with scoop.
b. Nothing pinned: Netlify uses its default `10.x`.

➡️ Recommendation: a. Without the pin, Netlify would resolve the lockfile with a pnpm two majors older than yours, and lockfile format changes between majors break `pnpm install --frozen-lockfile` on CI.

### Answer to Q9

A

## Q10 - Pinning the Node version

Is the Node version pinned for Netlify and local development?

a. A `.node-version` file at the root with `24`, the major you run locally. Netlify reads it, and so does `scoop`/`fnm`-style tooling.
b. `NODE_VERSION` set in `netlify.toml` under `[build.environment]`.
c. Not pinned: Netlify's default Node.

➡️ Recommendation: a, `.node-version` with `24`. One file that both Netlify and local tools read, and pnpm 12 needs a recent Node.

### Answer to Q10

A

## Q11 - The grilling issue for a shared auth and proxy module

Where do I record the issue about turning the four functions into a module shared between repositories?

a. In `tenant-bills-app`, titled "Grill a shared GitHub auth and proxy module for Netlify functions", labelled `needs-triage`, linking `french-gas-stations-scraper` and this session.
b. In `french-gas-stations-scraper`, where the code was written first.
c. In a new dedicated repository created for the module.

➡️ Recommendation: a. The question came up here, and creating a repository before grilling it would decide the outcome in advance. I create it with `gh issue create` once you confirm.

### Answer to Q11

A

## Q12 - Language of the URL paths

With file-based routing, the file names under `src/pages/` are the URL paths. Which language are they in?

a. English (`/periods/2026-2027/settlement`): file names stay in English like the rest of the code (Q15 of the functional breakdown). The installed PWA hides the address bar anyway.
b. French (`/periodes/2026-2027/regularisation`): matches the French UI, but makes French file names in an English codebase.

➡️ Recommendation: a, English. URLs are code here: they are rarely seen in the installed app, and English paths keep Q15's rule without exceptions.

### Answer to Q12

A

## Q13 - Route map

Is this the route map for v1 (paths shown in English, pending Q12)?

- `/sign-in`: the sign-in page, the only public route besides the OAuth callback landing.
- `/`: redirects to the current period (the one containing today's date), or to `/periods` when none exists.
- `/periods`: period management (list of periods, "Nouvelle période").
- `/periods/[period]`: the period table, `[period]` being `2026-2027`.
- `/periods/[period]/months/[month]`: "Saisie du mois", `[month]` being `2026-10` as in the period file.
- `/periods/[period]/settlement`: the settlement view.

a. Yes, as listed.
b. With changes (say which).

➡️ Recommendation: a. Each view gets one URL, the parameters reuse the period file's own identifiers, and the phone shortcut "this month" is just `/periods/2026-2027/months/2026-10`.

### Answer to Q13

A

## Q14 - Table and "Saisie du mois" by screen size

Q20 of the functional breakdown says: period table on large screens, "Saisie du mois" on small screens. How does the router express that?

a. Two separate routes (Q13), both reachable on any screen size. Only the landing redirect (`/`) picks by screen size: the table on a large screen, the current month's form on a small one.
b. One route, `/periods/[period]`, that renders the table or the form depending on the screen width; the month is then a query parameter.
c. Two separate routes, and the table route redirects to the form on a small screen (no table on a phone at all).

➡️ Recommendation: a. It honours Q20 for the default experience without forbidding a glance at the table on a phone, or a single-month form on the computer.

### Answer to Q14

A

## Q15 - Sign-in gating

How are the routes protected?

a. One global `router.beforeEach` guard: every route requires a session unless its page declares `meta: { public: true }` (`/sign-in`). No session > redirect to `/sign-in?redirect=<path>`, then back after sign-in.
b. A check inside each page.

➡️ Recommendation: a. One place to read, and a forgotten check on a new page cannot leak the data.

### Answer to Q15

A

## Q16 - Remaining `src/` folders

Besides `src/domain/` (Q5), `src/sync/` (Q6) and `src/pages/` (Q2), which top-level folders does `src/` start with?

a. `assets/`, `components/` (with `ui/` for shadcn-vue and `layout/` for the app shell), `composables/`, `lib/` (shadcn-vue's `cn` helper), `router/`. No `config/`, `enums/`, `i18n/`, `plugins/`, `services/`, `types/` or `utils/`: types live with the code that owns them (period file types in `src/domain/`), and a folder is created when something needs it.
b. The reference project's full set, empty folders included.

➡️ Recommendation: a. The reference project carries four empty folders; starting lean keeps every folder meaningful, and `src/domain/` already owns the types.

### Answer to Q16

A

## Q17 - French UI strings

The UI is French only. Where do the French strings live?

a. Inline in the components, no i18n library and no `i18n/` folder.
b. A `vue-i18n` setup with a single `fr` locale, ready for a second language.

➡️ Recommendation: a. v1 has one language and one user; an i18n layer would add indirection to every label for a translation nobody asked for.

### Answer to Q17

A

## Q18 - Where the decision is recorded

Issue #4 asks for an ADR only if the decision meets the bar (hard to reverse, surprising without context, a real trade-off). How is it recorded?

a. A `docs/architecture.md` page with the package manager, the route map and the folder layout, and no ADR: switching package manager or moving folders is cheap at this stage, and file-based routing follows the reference project, so nothing is surprising.
b. A `docs/architecture.md` page, plus ADR 0006 for the one surprising part: pnpm and the Vue-free `src/domain/` and `src/sync/` folders, where this app differs from the reference project.
c. ADR 0006 holding everything.

➡️ Recommendation: a. None of the three choices is hard to reverse before the scaffold grows, so they fail the ADR bar. The page, linked from the README, is enough for F10 to start without guessing.

### Answer to Q18

A
