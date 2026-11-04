# Grilling round v01 — Environment variables (issue #10)

## Settled in v00

Nothing yet. Facts gathered before this round:

- Issue #10 asks for the final name and format of the Netlify environment variables (OAuth app credentials, data repo, sign-in allowlist), which ones are secrets, and where the decision is recorded.
- Earlier sessions settled: the data repo is fixed in an environment variable, no settings form (functional breakdown Q16); the auth callback refuses any login outside an allowlist kept in an environment variable, value `JeremieLitzler` (Q24); the four functions are copied from `french-gas-stations-scraper` (`docs/architecture.md`).
- `french-gas-stations-scraper` reads `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `netlify/functions/lib/environment.ts`, without trimming. Its `HISTORY_*` variables are trimmed because a pasted trailing newline broke the PAT twice (its issue #174). Its proxy takes owner and repo from the browser's settings, so it has no data repo variable to copy.
- For local development it commits nothing with values: a gitignored `.env.proton-pass` holds `pass://` references resolved by `pass-cli run`, generated from a committed `.env.proton-pass-example` by `create-env-proton-pass.sh`, pointing at a separate "(local)" OAuth app item.

## Q1 - OAuth app credential names

The copied functions already read `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

- a. Keep `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
- b. Rename them (for example `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET`).

➡️ Recommendation: a. They are the names the copied code and specs use, and keeping them makes the shared module of issue #14 easier.

### Answer to Q1

B. Rename but to `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`

## Q2 - Data repo: one variable or two

The proxy must refuse any path outside the data repo, so it compares against `owner/name`.

- a. One variable holding `owner/name`: `JeremieLitzler/tenant-bills-data`.
- b. Two variables, owner and name, like the reference's `HISTORY_GITHUB_OWNER` / `HISTORY_GITHUB_REPO`.

➡️ Recommendation: a. The value is used whole (it is exactly the `/repos/{owner}/{repo}` segment the proxy checks), and one variable cannot be half set.

### Answer to Q2

A

## Q3 - Naming of the app's own variables

The working names are `DATA_REPO` and `ALLOWED_LOGINS`.

- a. Keep them bare: `DATA_REPO`, `ALLOWED_LOGINS`.
- b. Prefix them with `GITHUB_` (`GITHUB_DATA_REPO`, `GITHUB_ALLOWED_LOGINS`), so the Netlify UI lists all four together.
- c. Prefix them with the app name (`TENANT_BILLS_DATA_REPO`, ...).

➡️ Recommendation: a. One site holds one app, so a prefix adds nothing, and the bare names are already used in the earlier grillings and the issue.

### Answer to Q3

I'd go for A. But does `DATA_REPO` hold `JeremieLitzler/tenant-bills-data`?

## Q4 - Allowlist separator

Today the allowlist holds one login. If a second one is ever added:

- a. Comma-separated, spaces around entries ignored: `JeremieLitzler, someone-else`.
- b. Space-separated.
- c. A JSON array: `["JeremieLitzler"]`.

➡️ Recommendation: a. It is the most common env-var list format, a single login needs no separator at all, and GitHub logins cannot contain commas or spaces.

### Answer to Q4

A is fine

## Q5 - Allowlist login comparison

GitHub logins are case-insensitive (`jeremielitzler` and `JeremieLitzler` are the same account), and the callback compares the value against the `login` field GitHub returns.

- a. Case-insensitive comparison.
- b. Exact comparison.

➡️ Recommendation: a. A typo in case in the Netlify UI would otherwise lock you out with no visible reason.

### Answer to Q5

A

## Q6 - Missing or empty allowlist

If `ALLOWED_LOGINS` is not set, or set to an empty string:

- a. Fail closed: refuse every login, and log the misconfiguration in the function log.
- b. Allow every login.

➡️ Recommendation: a. The allowlist is the security boundary; a forgotten variable must not open the app to any GitHub user.

### Answer to Q6

A.

Not only log into the function, but make sure the feedback is clear to the user on the webapp.

## Q7 - Missing data repo

If `DATA_REPO` is not set, or not in `owner/name` form:

- a. The proxy refuses every request with a 500 and logs the misconfiguration; nothing falls back to a default repo.
- b. Fall back to a hard-coded `JeremieLitzler/tenant-bills-data`.

➡️ Recommendation: a. Same reasoning as Q6, and the reference's `readGithubOAuthCredentials()` already returns `null` on a missing value for the caller to refuse.

### Answer to Q7

Same answer as Q6

## Q8 - Trimming values

- a. Trim every variable on read (the four of them), as the reference does for its `HISTORY_*` variables.
- b. Trim none, like the reference's OAuth credentials.

➡️ Recommendation: a. A trailing newline pasted into the Netlify UI caused two incidents in the reference project; trimming costs one `?.trim()` per read.

### Answer to Q8

A

## Q9 - Which variables are marked secret in Netlify

A Netlify "secret" value is hidden after it is saved and cannot be read back from the UI.

- a. Only `GITHUB_CLIENT_SECRET`. The client ID is public anyway (it is in the GitHub authorize URL), and the data repo and allowlist are config you want to be able to read back.
- b. `GITHUB_CLIENT_SECRET` and `GITHUB_CLIENT_ID`.
- c. All four.

➡️ Recommendation: a. Only the client secret grants anything; hiding the others makes a misconfiguration harder to spot.

### Answer to Q9

A

## Q10 - Netlify scope of the variables

Netlify scopes a variable to Builds, Functions, Runtime and Post processing. Nothing in the Vite build or the client bundle needs any of the four.

- a. Functions scope only, for all four.
- b. All scopes (the Netlify default).

➡️ Recommendation: a. It keeps the values out of the build environment, so no build step can ever inline one into the bundle.

### Answer to Q10

A

## Q11 - Netlify deploy contexts

GitHub OAuth apps redirect only under their registered callback URL, so sign-in cannot work on deploy previews or branch deploys (their host differs) with the production app.

- a. Set the variables in the production context only. Deploy previews then show the sign-in page, and the functions refuse with a 500.
- b. Set them in all contexts (they would still fail at the OAuth redirect on previews).

➡️ Recommendation: a. It states plainly that only production is a working deployment, and keeps the client secret out of preview builds.

### Answer to Q11

A, with a twist: I'll have a local environment. Also, could we not use two Netlify apps: one production and one staging and when a PR opens, the "preview" deploys to the staging rather than the regular preview of Netlify?

## Q12 - Separate OAuth app for local development

`netlify dev` serves on `http://localhost:8888`, a different callback URL from production.

- a. A second OAuth app, "(local) Tenant bills", with its own client ID and secret, as in the reference project.
- b. One OAuth app, switching its callback URL by hand when developing.

➡️ Recommendation: a. It never touches production sign-in, and it is how the reference project already works.

### Answer to Q12

A

## Q13 - Data repo used in local development

With `DATA_REPO=JeremieLitzler/tenant-bills-data` locally, every edit made while developing is a real commit in the real data.

- a. A separate data repo for local development (for example `JeremieLitzler/tenant-bills-data-dev`), seeded with a copy of `docs/examples/2026-2027.json`.
- b. The real data repo, being careful.

➡️ Recommendation: a. The save queue writes on every cell edit; testing it against the real data would mix test commits into the history that ADR 0004 relies on.

### Answer to Q13

What about this:

- the production app commits to `main` branch.
- the staging app commits to `staging` branch.
- the local app commits to `develop` branch.

## Q14 - How local development gets the values

- a. The reference's Proton Pass pattern: a committed `.env.proton-pass-example` (with `pass://` placeholders for the two credentials and plain values for `DATA_REPO` and `ALLOWED_LOGINS`), a gitignored `.env.proton-pass`, a `create-env-proton-pass.sh` script, and `pnpm run dev:netlify` wrapping `netlify dev` in `pass-cli run`.
- b. A committed `.env.example` with empty values, copied to a gitignored `.env` filled by hand.

➡️ Recommendation: a. No plaintext secret ever lands on disk, and the pattern and its script already work in the reference project.

### Answer to Q14

A, see the `create-env-proton-pass.sh` script in the french gas stations scraper. Only the item name will change to `local-tenant-bills-github-oauth`.

## Q15 - Where the decision is documented

The issue asks for an env example file and the docs.

- a. The example file of Q14 plus an "Environment variables" section in `docs/architecture.md` (name, format, secret or not, scope, context, behaviour when missing), linked from the README's setup steps.
- b. The same, but in a new `docs/environment-variables.md`.

➡️ Recommendation: a. `docs/architecture.md` already holds the other scaffold choices, and none of these choices meets the ADR bar (they are cheap to change).

### Answer to Q15

B with a reference link in `docs/architecture.md`
