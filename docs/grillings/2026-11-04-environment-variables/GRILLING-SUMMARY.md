# Grilling summary — Environment variables (issue #10)

## Shared understanding

The Netlify functions read five environment variables. The OAuth app credentials are `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`, renamed from the `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` of `french-gas-stations-scraper`, so the copied functions and their specs change to match. The data repo is one variable, `DATA_REPO`, holding `owner/name` (`JeremieLitzler/tenant-bills-data`). The sign-in allowlist is `ALLOWED_LOGINS`, a comma-separated list with spaces around entries ignored, compared case-insensitively against the login GitHub returns. The app's own variables carry no prefix, since one Netlify site holds one app.

The starting proposal had one data repo value per environment and a separate data repo for local development. That changed in v01 (Q13): there is one data repo, and each environment writes its own branch of it: production writes `main`, staging writes `staging`, local development writes `develop`. This added a fifth variable, `DATA_BRANCH`, required everywhere like the others (Q18). The proxy sets the branch on every request from `DATA_BRANCH` (`ref` on reads and listings, `branch` on writes) and ignores whatever the client sends (Q19). The reason is that the OAuth token can write every branch of the repo, so the proxy is the only place that can keep local development and staging off `main`.

Every variable is trimmed on read, since a pasted trailing newline caused two incidents in the reference project. None has a fallback: a missing or empty variable refuses every request, logs the cause in the function log, and the web app says so. On the sign-in page, a refused login shows "Ce compte GitHub n'est pas autorisé à utiliser l'application." (`/sign-in?error=not-allowed`), and a missing allowlist or OAuth credential shows a misconfiguration message (`/sign-in?error=misconfigured`). When `DATA_REPO` or `DATA_BRANCH` is missing, the proxy returns a 500 with a `misconfigured` body, and the app shows a full-page error instead of the period list or table, leaving the patch queue untouched in IndexedDB so nothing typed is lost (ADR 0004). The web app never names the missing variable (Q22): the message stays generic and points to the function logs, with a link to `https://app.netlify.com/`. The variable is named in the function log only.

In Netlify, only `GITHUB_OAUTH_CLIENT_SECRET` is marked secret: the client ID is public anyway, and hiding the data repo or the allowlist would only make a misconfiguration harder to spot. All variables are scoped to Functions only, so no build step can inline one into the bundle. On the production site they are set in the production context only, and deploy previews are turned off, since a preview's host never matches the OAuth callback URL and so a preview can never sign in.

Staging was not in the starting proposal. It came from the v01 answer to Q11 and was settled in v02 (Q16) as a second Netlify site, `tenant-bills-staging`, with no automatic builds: a GitHub Actions job on each pull request builds the branch and deploys it to the staging site's fixed URL with `netlify deploy --prod`. Staging uses the same five variable names, its own OAuth app, and `DATA_BRANCH=staging`. Building it is a separate issue; issue #10 only records the names.

Local development has its own OAuth app (callback on `http://localhost:8888`) and follows the reference's Proton Pass pattern: a committed `.env.proton-pass-example`, a gitignored `.env.proton-pass` made by `create-env-proton-pass.sh`, and `pass-cli run` wrapping `netlify dev`. The item is `local-tenant-bills-github-oauth` in the `Common` vault, with the fields `Client ID` and `Client Secret`. The variables are documented in a new `docs/environment-variables.md`, linked from `docs/architecture.md`. None of these choices met the ADR bar, and none adds a domain term to `GLOSSARY.md`.

## Decision index

- Q1 (v01): the OAuth credentials are `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`.
- Q2 (v01): the data repo is one variable holding `owner/name`.
- Q3 (v01): no prefix on the app's variables: `DATA_REPO`, `ALLOWED_LOGINS`; production `DATA_REPO` is `JeremieLitzler/tenant-bills-data`.
- Q4 (v01): `ALLOWED_LOGINS` is comma-separated, spaces around entries ignored.
- Q5 (v01): logins are compared case-insensitively.
- Q6 (v01): a missing or empty allowlist refuses every login, logs it, and the web app shows a clear message.
- Q7 (v01): a missing or malformed `DATA_REPO` makes the proxy refuse with a 500, logs it, no fallback, and the web app shows a clear message.
- Q8 (v01): every variable is trimmed on read.
- Q9 (v01): only `GITHUB_OAUTH_CLIENT_SECRET` is marked secret in Netlify.
- Q10 (v01): every variable is scoped to Functions only.
- Q11 (v01): on the production site, variables are set in the production context only.
- Q12 (v01): local development has its own OAuth app.
- Q13 (v01): one data repo, one branch per environment: `main` production, `staging` staging, `develop` local.
- Q14 (v01): local development uses the Proton Pass pattern, item `local-tenant-bills-github-oauth`.
- Q15 (v01): documented in a new `docs/environment-variables.md`, linked from `docs/architecture.md`.
- Q16 (v02): staging is a second Netlify site fed by a GitHub Actions job on each pull request, built in its own issue.
- Q17 (v02): deploy previews are turned off on the production site.
- Q18 (v02): the branch is a separate required variable, `DATA_BRANCH`, with no fallback.
- Q19 (v02): the proxy sets `ref` and `branch` from `DATA_BRANCH` on every request; the client never names a branch.
- Q20 (v02): the Proton Pass item lives in the `Common` vault, fields `Client ID` and `Client Secret`.
- Q21 (v02): two sign-in refusal messages, `?error=not-allowed` and `?error=misconfigured`.
- Q22 (v02): misconfiguration messages in the web app do not name the variable; they point to the function logs with a link to `https://app.netlify.com/`.
- Q23 (v02): a proxy misconfiguration shows a full-page error, and the patch queue stays in IndexedDB.
- Q24 (v02): missing OAuth credentials get the same treatment as Q6.

Superseded: the "separate data repo for local development" recommendation of Q13 was replaced by one branch per environment; Q23's example message naming `DATA_REPO` is superseded by Q22 (generic message, link to the Netlify function logs).

## Not grilled, settled in v03

These points were never grilled but had to be decided to write this summary. Your corrections in v03 settled them:

- The exact French wording of the messages, including the generic misconfiguration message with its link to `https://app.netlify.com/`, is decided during implementation, with your guidance.
- The proxy's `misconfigured` response body drops `variable`: only the function log names the missing variable.
- `.env.proton-pass-example` is the committed template. Only the two OAuth credentials are `pass://` placeholders, which `create-env-proton-pass.sh` resolves into the gitignored `.env.proton-pass`. `DATA_REPO=JeremieLitzler/tenant-bills-data`, `DATA_BRANCH=develop` and `ALLOWED_LOGINS=JeremieLitzler` are plain values in the template, like the reference's `HISTORY_*` lines.
- The `develop` and `staging` branches of `tenant-bills-data` were created from `main` (its initial commit) and pushed on 2026-11-04.
- The staging site is named `tenant-bills-staging`, and it gets its own OAuth app.
- Netlify's built-in `URL` variable (read by `github-auth-start` for the callback URL) stays as in the reference and is not documented as one of the app's variables.
