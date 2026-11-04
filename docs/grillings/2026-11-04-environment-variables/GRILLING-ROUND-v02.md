# Grilling round v02 — Environment variables (issue #10)

## Settled in v01

- Q1: the OAuth credentials are renamed `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`. The copied functions and specs are changed to match.
- Q2: the data repo is one variable holding `owner/name`.
- Q3: the app's own variables have no prefix: `DATA_REPO` and `ALLOWED_LOGINS`. To your question: yes, `DATA_REPO` holds `JeremieLitzler/tenant-bills-data` in production (Q2).
- Q4: `ALLOWED_LOGINS` is comma-separated, with spaces around entries ignored.
- Q5: logins are compared case-insensitively.
- Q6: a missing or empty `ALLOWED_LOGINS` refuses every login and logs it in the function log. You added that the web app must show a clear message too: see Q21 and Q22.
- Q7: a missing or malformed `DATA_REPO` makes the proxy refuse every request with a 500 and log it, with no fallback repo. Same addition as Q6: see Q22 and Q23.
- Q8: every variable is trimmed on read.
- Q9: only `GITHUB_OAUTH_CLIENT_SECRET` is marked secret in Netlify.
- Q10: all variables are scoped to Functions only.
- Q11: on the production site, the variables are set in the production context only. Your staging idea is taken up in Q16 and Q17.
- Q12: local development uses its own OAuth app.
- Q13: one data repo for every environment, one branch each: production writes `main`, local development writes `develop`, staging writes `staging` (if Q16 keeps a staging). This adds a variable: see Q18 and Q19.
- Q14: local development uses the Proton Pass pattern of `french-gas-stations-scraper` (`.env.proton-pass-example`, gitignored `.env.proton-pass`, `create-env-proton-pass.sh`), with the item named `local-tenant-bills-github-oauth`.
- Q15: the variables are documented in a new `docs/environment-variables.md`, linked from `docs/architecture.md`.

## Q16 - Staging

You asked whether a pull request could deploy to a staging site instead of a Netlify deploy preview. Here is what constrains it: a GitHub OAuth app only redirects under its registered callback URL, so sign-in needs a **fixed** host. Every deploy preview has its own host (`deploy-preview-12--site.netlify.app`), so a preview can never sign in, whichever site builds it. Netlify cannot send one site's preview to another site either. What does work:

- a. **Second Netlify site, fed by a workflow.** A `tenant-bills-staging` site with no automatic builds. A GitHub Actions job on each pull request builds the branch and runs `netlify deploy --prod --site <staging-site-id>`, so the staging site's fixed URL always shows the latest pushed PR. It needs a Netlify token as a GitHub secret, and its own OAuth app with the staging URL as callback. Two open PRs overwrite each other (the last push wins).
- b. **Same site, a `staging` branch deploy.** Netlify gives the `staging` branch a fixed URL (`staging--site.netlify.app`), and env var values can differ per branch. A PR reaches staging only when its branch is pushed to `staging` (by hand or by a workflow).
- c. **No staging in v1.** Production and local only; staging becomes its own issue if it is ever missed.

The variable names do not change with any choice; only the values and the Netlify context do.

➡️ Recommendation: a, built in its own issue. It is the only one that matches "when a PR opens, it deploys to staging" without pushing branches around, and a separate site keeps the staging OAuth secret and token out of the production site entirely. Issue #10 only records that staging uses the same four variable names (plus Q18's) with its own OAuth app and `DATA_BRANCH=staging`.

### Answer to Q16

A

## Q17 - Netlify deploy previews on the production site

Since a deploy preview can never sign in (Q16), it only ever shows the sign-in page.

- a. Turn deploy previews off on the production site.
- b. Leave them on (they still prove the build deploys).

➡️ Recommendation: a. The CI workflow of `docs/architecture-tests.md` already runs `pnpm build` on every pull request, so a preview adds nothing, and turning it off guarantees no PR build ever runs in the production site's environment.

### Answer to Q17

A

## Q18 - How the data branch is given

Q13 needs the functions to know which branch of the data repo to use.

- a. A separate variable, `DATA_BRANCH` (`main`, `develop`, `staging`), required everywhere: missing means the same refusal as Q7, never a fallback to the repo's default branch.
- b. Folded into `DATA_REPO`: `JeremieLitzler/tenant-bills-data#main`.

➡️ Recommendation: a. `DATA_REPO` keeps the plain value you confirmed in Q3, and the missing-value rule of Q7 still holds: a forgotten `DATA_BRANCH` locally can never write to `main`.

### Answer to Q18

A

## Q19 - Who chooses the branch on each request

The GitHub Contents API takes the branch as `ref` on reads and directory listings, and as `branch` on writes. The token in the cookie can write every branch of the repo, so only the proxy can keep local development and staging off `main`.

- a. The proxy sets `ref` and `branch` from `DATA_BRANCH` on every request, replacing whatever the client sent. The client never names a branch.
- b. The client sends the branch, and the proxy refuses any request whose branch differs from `DATA_BRANCH`.

➡️ Recommendation: a. One place decides, the client code has nothing to get wrong, and the restriction sits next to the repo restriction the proxy specs already guard.

### Answer to Q19

A

## Q20 - Proton Pass vault

The reference's script looks the item up in the `Common` vault.

- a. The `local-tenant-bills-github-oauth` item lives in the `Common` vault, with the fields `Client ID` and `Client Secret`, as in the reference.
- b. Another vault or other field names (say which).

➡️ Recommendation: a. The script then changes by one line (the item title).

### Answer to Q20

A

## Q21 - Sign-in refusal messages

The callback redirects back to `/sign-in` when it refuses. Two causes can refuse a login: the login is not in the list, or the list is missing or empty (Q6).

- a. Two distinct messages, passed as `/sign-in?error=not-allowed` and `/sign-in?error=misconfigured`: "Ce compte GitHub n'est pas autorisé à utiliser l'application." and "L'application est mal configurée : la connexion est impossible."
- b. One message for both: "Connexion refusée."

➡️ Recommendation: a. You asked for clear feedback, and when the cause is your own Netlify settings, "not allowed" would send you looking in the wrong place.

### Answer to Q21

A

## Q22 - Naming the variable in misconfiguration messages

The sign-in page is public: anyone reaching it sees the message.

- a. The message names the variable: "... mal configurée : `ALLOWED_LOGINS` est absent." (and likewise for `DATA_REPO`, `DATA_BRANCH`, the OAuth credentials). It never shows a value.
- b. A generic message in the web app; the variable is named only in the function log.

➡️ Recommendation: a. A variable name tells a stranger nothing useful (the names are in the public repo anyway), and it saves you opening the Netlify function log.

### Answer to Q22

B since I can go to the function logs. Hint the message about that with a link to `https://app.netlify.com/`

## Q23 - Data proxy misconfiguration in the web app

When `DATA_REPO` or `DATA_BRANCH` is missing (Q7, Q18), every proxy request gets a 500. The proxy can return a body such as `{ "error": "misconfigured", "variable": "DATA_REPO" }`.

- a. The app recognises that body and shows a full-page error instead of the period list or table ("L'application est mal configurée : `DATA_REPO` est absent."). Patches already in the queue stay in IndexedDB, untouched, and are sent once the configuration is fixed.
- b. The app treats it like any other failed request (the sync status shows an error and the queue retries later).

➡️ Recommendation: a. A configuration error does not go away by retrying, and a full-page message is the clear feedback you asked for in Q6 and Q7. Keeping the queue honours ADR 0004: nothing typed is lost.

### Answer to Q23

A

## Q24 - Missing OAuth credentials

The reference's `readGithubOAuthCredentials()` returns `null` when a credential is missing, and the caller refuses.

- a. Same treatment as Q6: `github-auth-start` and `github-auth-callback` refuse, log it, and redirect to `/sign-in?error=misconfigured` naming the missing variable (Q21, Q22).
- b. Keep the reference's current behaviour unchanged.

➡️ Recommendation: a. All five variables then fail the same way, and the web app explains every one of them.

### Answer to Q24

A
