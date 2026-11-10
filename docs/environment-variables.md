# Environment variables

The Netlify functions read five environment variables, settled in `docs/grillings/2026-11-04-environment-variables/` (issue #10). None of these choices met the ADR bar.

## The variables

- `GITHUB_OAUTH_CLIENT_ID`: the client ID of the GitHub OAuth app. Not secret (it appears in the GitHub authorize URL).
- `GITHUB_OAUTH_CLIENT_SECRET`: the client secret of the GitHub OAuth app. **Secret.**
- `DATA_REPO`: the data repo as `owner/name`, `JeremieLitzler/tenant-bills-data`. Not secret.
- `DATA_BRANCH`: the branch of the data repo the proxy reads and writes. Not secret.
- `ALLOWED_LOGINS`: the GitHub logins allowed to sign in, comma-separated, with spaces around entries ignored, `JeremieLitzler`. Not secret.

The OAuth credentials are named `GITHUB_OAUTH_*`, not the `GITHUB_CLIENT_*` of `french-gas-stations-scraper`: the functions and specs copied from it are changed to match.

Netlify's built-in `URL` variable (read by `github-auth-start` to build the callback URL) is not one of the app's variables and needs no setup.

## How they are read

- Every value is trimmed on read: a trailing newline pasted into the Netlify UI broke the reference project twice.
- `ALLOWED_LOGINS` is compared case-insensitively against the `login` GitHub returns, since GitHub logins are case-insensitive.
- The proxy sets the branch on every request from `DATA_BRANCH` (`ref` on reads and directory listings, `branch` on writes), replacing whatever the client sent. The client never names a branch. The OAuth token can write every branch of the data repo, so the proxy is the only place that keeps local development and staging off `main`.

## When a variable is missing

No variable has a fallback. A missing, empty or malformed variable refuses every request and names the variable in the function log. The web app never names it: it shows a generic misconfiguration message pointing to the function logs, with a link to `https://app.netlify.com/`.

- `ALLOWED_LOGINS`, `GITHUB_OAUTH_CLIENT_ID` or `GITHUB_OAUTH_CLIENT_SECRET` missing: `github-auth-start` and `github-auth-callback` refuse and redirect to `/sign-in?error=misconfigured`.
- A login outside `ALLOWED_LOGINS`: the callback redirects to `/sign-in?error=not-allowed` ("Ce compte GitHub n'est pas autorisé à utiliser l'application.").
- `DATA_REPO` or `DATA_BRANCH` missing (or `DATA_REPO` not in `owner/name` form): the proxy answers every request with a 500 and the body `{ "error": "misconfigured" }`. The app shows a full-page error instead of the period list or table. Patches already in the queue stay in IndexedDB and are sent once the configuration is fixed.

## Environments

Each environment uses its own OAuth app and its own branch of the one data repo.

- Production: the production Netlify site, `DATA_BRANCH=main`.
- Staging: a second Netlify site, `tenant-bills-staging`, `DATA_BRANCH=staging`, with its own OAuth app. It has no automatic builds: a GitHub Actions job on each pull request builds the branch and deploys it to the site's fixed URL with `netlify deploy --prod`. 

### How the staging deploy is wired

- The workflow `.github/workflows/staging-deploy.yml` runs on each pull request (opened and each push), builds the branch and runs `netlify deploy --prod` against the staging site. A `concurrency` group makes the last push win.
- Two GitHub repository secrets feed it: `NETLIFY_AUTH_TOKEN` (a Netlify personal access token) and `NETLIFY_STAGING_SITE_ID` (the staging site's ID).
- The staging site's five variables (production context, Functions scope, only the client secret secret, `DATA_BRANCH=staging`) are set in the Netlify dashboard. The staging OAuth app's callback URL is under the staging site's fixed URL.
- Fork pull requests get no secrets, so they do not deploy. This is a one-developer repository.
- Local development: `netlify dev` on `http://localhost:8888`, `DATA_BRANCH=develop`, with its own OAuth app.

## Netlify settings

On each Netlify site:

- Only `GITHUB_OAUTH_CLIENT_SECRET` is marked secret. The others stay readable in the UI, so a misconfiguration is easy to spot.
- Every variable is scoped to Functions only, so no build step can inline one into the client bundle.
- Every variable is set in the production context only.

Deploy previews are turned off on the production site. A GitHub OAuth app only redirects under its registered callback URL, and every deploy preview has its own host, so a preview can never sign in. The pull request CI workflow already proves the build (see `docs/architecture-tests.md`).

Netlify applies a changed variable to a function only on the next deploy: redeploy after any change.

## Local development

Local development follows the Proton Pass pattern of `french-gas-stations-scraper`, so no secret value is written to disk.

1. In the `Common` Proton Pass vault, keep an item named `local-tenant-bills-github-oauth` with the fields `Client ID` and `Client Secret` of the local OAuth app (callback URL under `http://localhost:8888`).
2. Run `./create-env-proton-pass.sh` once (it needs `pass-cli`, signed in, and `jq`). It copies the committed `.env.proton-pass-example` to the gitignored `.env.proton-pass`, replacing the vault and item placeholders with their IDs.
3. Start the app with `pnpm run dev:netlify` (which runs `pass-cli run --env-file .env.proton-pass -- netlify dev`), which resolves the two `pass://` references at runtime.

`DATA_REPO`, `DATA_BRANCH=develop` and `ALLOWED_LOGINS` are plain values in the template.
