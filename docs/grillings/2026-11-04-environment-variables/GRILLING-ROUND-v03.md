# Grilling round v03 — Environment variables (issue #10)

## Settled in v02

- Q16: staging is a second Netlify site, `tenant-bills-staging`, with no automatic builds, deployed by a GitHub Actions job on each pull request with `netlify deploy --prod`; it is built in its own issue, and issue #10 only records its variable names.
- Q17: deploy previews are turned off on the production site.
- Q18: the branch is a separate variable, `DATA_BRANCH`, required everywhere with no fallback.
- Q19: the proxy sets `ref` and `branch` from `DATA_BRANCH` on every request, replacing whatever the client sent.
- Q20: the Proton Pass item `local-tenant-bills-github-oauth` lives in the `Common` vault, with the fields `Client ID` and `Client Secret`.
- Q21: two sign-in refusal messages, `/sign-in?error=not-allowed` and `/sign-in?error=misconfigured`.
- Q22: the web app does not name the missing variable; the message is generic, says to check the function logs, and links to `https://app.netlify.com/`. Only the function log names the variable. This also applies to Q23's full-page message.
- Q23: a proxy misconfiguration shows a full-page error instead of the period list or table, and the patch queue stays in IndexedDB.
- Q24: missing OAuth credentials get the same treatment as Q6, through `/sign-in?error=misconfigured`.

## Q25 - Does the summary match your understanding?

`GRILLING-SUMMARY.md` restates the session, lists every decision, gives a section to paste into issue #10, and ends with six points that were never grilled but had to be decided to write it (message wording, the proxy's error body without `variable`, the example file's plain values, who creates the `develop` and `staging` data branches, the staging names, Netlify's built-in `URL`).

➡️ Recommendation: yes, if the six "Not grilled" points match what you want; otherwise, write corrections here and I will edit the summary in place.

### Answer to Q25

Approved
