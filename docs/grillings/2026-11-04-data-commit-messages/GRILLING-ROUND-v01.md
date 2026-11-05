# Grilling round v01 — Data commit messages (issue #11)

## Settled in v00

Nothing yet. Facts gathered before this round:

- Issue #11 asks for the commit message the save queue uses on each drain to the data repo `JeremieLitzler/tenant-bills-data`, including whether it lists the edited months or fields, the message for "Nouvelle période", the message for a retried write after a 409, and where the decision is recorded. Working proposal: `data(2026-2027): 3 edits`.
- ADR 0004: each blur enqueues a patch `{ period, month, field, value }`; `drainQueue()` sends the queued patches as one GitHub Contents API `PUT`, never two at once. On a 409 it pulls the remote file, re-applies the same patches and retries once.
- The Contents API writes one file per `PUT`, so one `PUT` is one commit on one period file. A drain holding patches for two periods (mid-August to October, ADR 0006) makes one commit per period file.
- `docs/period-file.md`: a field is `"<section>.<key>"` (e.g. `electricity.ctaTax`), a settings patch has `month: null` and `field: "settings.<key>"`, and `value: null` removes the key. "Estimer les relevés" writes ordinary patches; "Clôturer la période" writes `settings.closedOn`. The file is written so each commit's diff shows only the edited cells.
- The data repo has a single commit today, "Initial commit", so there is no existing convention to follow.
- The commit goes through the Netlify proxy with the signed-in user's OAuth token, so author and committer are the GitHub user; only the message is ours to choose.

## Q1 - Subject line style and language

The subject is what `git log --oneline` and the GitHub history page show.

- a. Conventional-commit style in English, as proposed: `data(2026-2027): 3 edits`.
- b. Plain English without a type prefix: `2026-2027: 3 edits`.
- c. French, matching the app's UI: `2026-2027 : 3 modifications`.

➡️ Recommendation: a. The data repo is read by you on GitHub, not by the tenant, and the app repo's own history and docs are in English with a `type(scope):` prefix; the period name as scope makes `git log -- periods/2026-2027.json` redundant at a glance.

### Answer to Q1

A

## Q2 - Listing the edits in the commit body

The subject says how many patches the commit carries. What about the patches themselves?

- a. Subject only; the diff shows what changed.
- b. A body with one line per patch: `2026-10 electricity.ctaTax = 2.42`, settings as `settings.monthlyTenantBillAdvance = 70`.
- c. Edited months in the subject (`data(2026-2027): 3 edits in 2026-10, 2026-11`), no body.

➡️ Recommendation: b. A drain can carry a dozen patches typed offline on the phone; the body reads them in the field names the app uses, even where the JSON diff is split across distant lines. The subject stays short whatever the count, which c does not.

### Answer to Q2

I prefer C since it summarizes the edits and the diff shows the details.

## Q3 - Distinct subjects for special writes

Some writes are not plain cell edits: "Nouvelle période" (the file is created), "Estimer les relevés" (a batch of estimated indexes) and "Clôturer la période" (`settings.closedOn`). They can drain mixed with ordinary edits in the same `PUT`.

- a. Creation gets its own subject; estimate and close stay ordinary patches counted as edits, readable from the body.
- b. Creation, estimate and close each get their own subject, and the app drains them in a `PUT` of their own, never mixed with other edits.
- c. All three are counted as edits; nothing is special.

➡️ Recommendation: a. Creation is a different call (a `PUT` without `sha`) carrying no patches, so it needs its own message anyway. Estimate and close are already ordinary patches per `docs/period-file.md`; forcing a separate `PUT` for them adds a drain rule for a cosmetic gain, and the body of Q2 b already shows `settings.closedOn` or the twelfth month's indexes.

### Answer to Q3

I agree with A

## Q4 - Message of a retried write after a 409

After a 409, the app re-applies the same patches on the fresh remote file and retries once.

- a. The same message as the first attempt; the retry is invisible in history.
- b. The same subject with a trailer in the body: `Rebased-after: 409`.
- c. A different subject: `data(2026-2027): 3 edits (rebased)`.

➡️ Recommendation: b. Only the successful attempt becomes a commit, so the history stays clean, while a trailer tells you later that this commit overrode a cell the other device had just written, which is exactly where you would look when a value seems to have jumped. It stays out of the subject, so `--oneline` reads the same.

### Answer to Q4

I see not added value to B so let's go for A

## Q5 - Where the decision is recorded

The format is cheap to change (it affects only future commits), so it does not meet the ADR bar.

- a. A "Commit messages" section in `docs/period-file.md`, after "Writing".
- b. A "Commit messages" section in `docs/architecture.md`, next to the `sync/` folder.
- c. A new `docs/data-commits.md`.

➡️ Recommendation: a. `docs/period-file.md` already holds the patch shape and the "Writing" rules that exist for the sake of each commit's diff, so the message format belongs right after them.

### Answer to Q5

B
