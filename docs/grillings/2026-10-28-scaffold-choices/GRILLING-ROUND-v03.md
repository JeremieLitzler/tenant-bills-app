# Grilling round v03 — scaffold choices: package manager, router, folder layout (issue #4)

## Settled in v02

- Q9: pnpm pinned with `"packageManager": "pnpm@12.16.1"`, bumped by hand.
- Q10: Node pinned to `24` in a `.node-version` file.
- Q11: the shared-module grilling issue goes in this repo with `needs-triage`. It is now created as #14.
- Q12: URL paths in English.
- Q13: route map approved as listed.
- Q14: table and "Saisie du mois" are separate routes, both reachable on any screen size; only `/` picks by screen size.
- Q15: one global `beforeEach` guard, `meta: { public: true }` on public pages, redirect to `/sign-in?redirect=<path>`.
- Q16: `src/` starts with `assets/`, `components/` (`ui/`, `layout/`), `composables/`, `domain/`, `lib/`, `pages/`, `router/`, `sync/`; nothing else until needed.
- Q17: French UI strings inline, no i18n library.
- Q18: recorded in `docs/architecture.md`, no ADR.

The frontier is empty. I wrote `GRILLING-SUMMARY.md` in this folder and `docs/architecture.md`.

## Q19 - Summary check

Do `GRILLING-SUMMARY.md` and `docs/architecture.md` match your understanding, including the three points in "Decided without grilling" (README link, unknown period or month in the URL left to F10, OAuth callback returning to the `redirect` path)?

a. Yes, as written.
b. With corrections (say which; I edit the files in place).

➡️ Recommendation: a. Every line traces back to an answer in v01 or v02, and the three points not grilled are small enough for F10 to settle.

### Answer to Q19

A
