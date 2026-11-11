# Grilling summary - feedback on the code review of issue #28

## What we agreed, in prose

The app keeps the "signed in" state in a companion cookie `gh_login`, set by the callback next to the HTTP-only `gh_token`. It is not HTTP-only, lasts the same 8 hours and holds only the login, which is not a secret. The router guard in `src/router/index.ts` reads it synchronously, so there is no IndexedDB hint, no `restore()`, no `markSignedIn()`, no `?signed-in=` query and no start-up call. The cookie is the v1 mechanism. We keep the early-implementation footprint small and F9 (#36) decides later whether to keep it or swap it for an IndexedDB hint. The cookie can be set by the visitor, but it is only a hint about the last known state. The HTTP-only token stays the truth and the first 401 corrects a stale hint.

Redirect logic sits in the guard: it sends a signed-out visitor to `/sign-in?redirect=<path>` and a signed-in visitor away from `/sign-in`. The callback redirects straight to the requested page, or `/`. `sign-in.vue` keeps only the button and the error messages. `safeRedirect.ts` stays.

Sharing code between `netlify/functions/` and `src/` is deferred to #39, as a pure TypeScript file tested against local and remote Netlify, with a fallback to two copies. Until then #28 keeps the two copies (`src/lib/safeRedirect.ts`, `netlify/functions/lib/redirect.ts`) and the app's own copy of the error codes. Constants used by more than one function (`STATE_COOKIE_NAME`, `TOKEN_COOKIE_NAME`, `REDIRECT_COOKIE_NAME`, the shared `/sign-in?error=...` paths) move to `netlify/functions/lib/cookies.ts` or one server-side lib file.

`readGithubLogin` becomes `exchangeCodeForGithubUser`, returning a `GithubUser` with `login` and `accessToken`. The F2/F3 scaffolding goes: `usePeriods.ts`, `clear()` and the shell's `clear()` call are removed. The sign-out confirmation hook stays inside `useSession` because stories 16 and 18 name it. The shell keeps its route re-run.

All UI strings move to a plain typed object `src/i18n/fr.ts`, with no library, imported by components and composables. This replaces the "inline" line of `docs/architecture.md`, which is updated. The wording is kept: the `misconfigured` text with the generic Netlify link, and the labels "Connexion", "Se connecter avec GitHub", "Se déconnecter". The header keeps the login name, as ticket #41 requires.

`failed` stays as the catch-all error code, because the code does not tell its four cases apart. `scope=repo` stays and is documented, since the data repo is private. `Secure` on the token cookie stays conditional on https and is documented, with a comment on #28. Offline sign-out clears the local state and leaves the cookie to expire, documented. The test helper moves to `tests/helpers/netlify-event.ts`.

Tickets #40 to #43 each get a comment once the code is final, with what was done and what changed against their text. The specs prove some criteria, which get ticked. The tickets stay open until their manual check passes (needs #39). The two deferrals are recorded as one comment on #39 (shared pure file) and one on #36 (fate of `gh_login`), plus pointer comments in the two code copies. Nothing is posted before you approve the wording.

## Decision index

- D1 (Q1b a): `gh_login` cookie is the v1 mechanism; no IndexedDB hint, `restore()`, `markSignedIn()`, `?signed-in=` query or start-up call; F9 decides later.
- D2 (Q2): redirect logic lives in the guard of `src/router/index.ts`; callback redirects straight to the target; `sign-in.vue` is button and messages only.
- D3: `safeRedirect.ts` stays.
- D4 (Q3, Q4): code sharing between functions and app is deferred to #39; two copies until then.
- D5 (Q4): constants used by several functions live in `netlify/functions/lib/cookies.ts` or one server lib file.
- D6 (Q5 a): `exchangeCodeForGithubUser`, `GithubUser { login, accessToken }`.
- D7 (Q6): not applicable, `sessionHint.ts` is removed.
- D8 (Q7 b): remove `usePeriods.ts`, `clear()` and the shell's `clear()` call; keep the confirmation hook in `useSession`.
- D9 (Q8 a, Q9): wording and labels kept as written.
- D10 (Q8b b): `src/i18n/fr.ts` plain typed object for every UI string; `docs/architecture.md` updated.
- D11 (Q10b a): the header keeps the login name (#41).
- D12 (Q11 a): keep `failed` as catch-all; add to `docs/environment-variables.md`.
- D13 (Q12 a): keep `scope=repo`; document the reason.
- D14 (Q13b a): `Secure` stays conditional on https; documented in `docs/environment-variables.md`; comment on #28.
- D15 (Q14 a): offline sign-out clears local state, cookie expires; documented.
- D16 (Q15 a): test helper moves to `tests/helpers/netlify-event.ts`; `tsconfig.node.json` updated.
- D17 (Q16 a): comment on #40 to #43 after the code is final; tick proven criteria; close each after its manual check.
- D18 (Q17 a): comments on #39 and #36 plus pointer comments in the code.
- D19: docs updated to the final code (`useSession` listing, `src/lib` line, redirect wording, `failed`, `scope=repo`, `Secure`); tickets #41 and #43 get a wording update (cookie instead of IndexedDB).
- D20: no outward step (comments, push, PR) without your approval.

## Rejected alternatives

- Q1/Q1b: IndexedDB hint now (c-d options), `localStorage`, start-up call to a new function, cookie as temporary with F9 removing it.
- Q2: keep both halves (guard out, page back); move the guard into `main.ts`.
- Q3: one shared pure file now; share nothing.
- Q4: everything in one shared file; per-file constants.
- Q5: rename only the fields; keep as is.
- Q7: remove everything including the confirmation; keep everything.
- Q8: your own wording; a link to the site's function logs with a build-time site name.
- Q8b: keep strings inline; only sign-in and sign-out strings in a module; `vue-i18n`.
- Q10b: drop the login name from the header and edit #41.
- Q11: fold the cases into `misconfigured`; redirect with no code.
- Q12: `public_repo`; GitHub App now.
- Q13b: force https locally with mkcert and `[dev.https]`; unconditional `Secure` over plain http.
- Q14: refuse offline sign-out; queue the logout.
- Q15: rename the helper and exclude it from coverage; leave it.
- Q16: close #40 and #42 now; say nothing on the tickets.
- Q17: pointer comments only; summary file only.
