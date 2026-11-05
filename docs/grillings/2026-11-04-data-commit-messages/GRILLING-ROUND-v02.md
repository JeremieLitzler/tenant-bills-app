# Grilling round v02 — Data commit messages (issue #11)

## Settled in v01

- Q1: subjects use the English conventional-commit style with the period name as scope: `data(2026-2027): ...`.
- Q2: no body. The subject gives the patch count and the edited months, e.g. `data(2026-2027): 3 edits in 2026-10, 2026-11`; the diff shows the details.
- Q3: only "Nouvelle période" gets its own subject. "Estimer les relevés" and "Clôturer la période" stay ordinary patches, counted as edits and drained with the others.
- Q4: a retried write after a 409 keeps exactly the same message as the first attempt; nothing marks the retry.
- Q5: the format is recorded in `docs/architecture.md`, not in `docs/period-file.md`, and with no ADR.

## Q6 - How a month is named in the subject

- a. `YYYY-MM`, the `month` value of the file: `in 2026-10, 2026-11`.
- b. A short English month name: `in Oct, Nov`.
- c. A French month name, as in the table header: `in octobre, novembre`.

➡️ Recommendation: a. It is the key the diff shows (`"month": "2026-10"`), it is unambiguous for a period spanning two calendar years, and it sorts.

### Answer to Q6

A

## Q7 - How a settings edit is named in the subject

A settings patch has `month: null` (for example `settings.closedOn` when the period is closed, or `settings.monthlyTenantBillAdvance`).

- a. The word `settings` in the list, after the months: `data(2026-2027): 1 edit in settings`, `data(2026-2027): 3 edits in 2026-07, settings`.
- b. A distinct verb for settings: `data(2026-2027): 2 edits in 2026-07, settings updated`.

➡️ Recommendation: a. One list, one rule, and closing a period reads plainly as `1 edit in settings`, which matches Q3's choice that a close is an ordinary patch.

### Answer to Q7

Ok, I see now that my answer for Q2 was short sighted.

Let's make the subjects short: `data(2026-2027): <n> edit(s) in [settings | one month | several months | settings and one month | settings and several months])`.

Then add a body with the split of edits count per "section" if there is more than one edited, basically anything but `settings | one month`.

## Q8 - Order of the list

- a. Months in period order (September first), `settings` last.
- b. In the order the patches were queued.

➡️ Recommendation: a. The same set of edits always gives the same subject, and a reader scans months in the order of the table.

### Answer to Q8

A

## Q9 - What the count counts

The queue key is `<month>|<section>.<key>`, so retyping a cell before the drain replaces its patch rather than adding one.

- a. The number of patches in the `PUT`, that is the number of distinct cells written, removals (`value: null`) included.
- b. The number of edited months.

➡️ Recommendation: a. It is what "edits" means in the working proposal, and the months already appear in the list, so b would repeat them.

### Answer to Q9

A

## Q10 - Singular

- a. `1 edit`, `2 edits`.
- b. Always `edits`, even for one: `1 edits`.

➡️ Recommendation: a. The subject is built by a function anyway; one extra condition keeps the history grammatical.

### Answer to Q10

A

## Q11 - Long lists

With the twelve months and the settings, the subject can reach about 120 characters (for example after a "Compteur remplacé" correction typed across the whole period offline).

- a. Always list everything, whatever the length.
- b. List up to a cap (say four entries), then `and N more`: `data(2026-2027): 14 edits in 2026-09, 2026-10, 2026-11, 2026-12 and 8 more`.
- c. Compress consecutive months into a range: `in 2026-09..2026-08`.

➡️ Recommendation: a. Such drains are rare, GitHub truncates a long subject on display without losing it, and a or c would need extra rules the diff makes unnecessary. A long subject is honest about a large drain.

### Answer to Q11

See my answer to Q7

## Q12 - Subject of the period creation commit

"Nouvelle période" creates `periods/YYYY-YYYY.json` with a `PUT` without `sha`, carrying the twelve months and the settings typed in the creation form, not patches.

- a. `data(2026-2027): create period`.
- b. `data(2026-2027): new period`.
- c. `data(2026-2027): Nouvelle période`, the button's label.

➡️ Recommendation: a. It describes the action in the same English as the edit subjects, and `create` matches the Contents API's meaning of a `PUT` without `sha`.

### Answer to Q12

A

## Q13 - Place in `docs/architecture.md`

- a. A new "Data commits" section after "State", since the save queue is described there.
- b. A new section at the end of the file, after "Period table".

➡️ Recommendation: a. The "State" section already describes the queue and `drainQueue()`, so the message each drain writes sits next to it.

### Answer to Q13

A
