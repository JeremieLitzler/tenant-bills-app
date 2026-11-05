# Grilling summary — Data commit messages (issue #11)

## Shared understanding

Every write to the data repo `JeremieLitzler/tenant-bills-data` is one GitHub Contents API `PUT` on one period file, so it is one commit, and only its message is ours to choose: author and committer are the signed-in GitHub user. The message follows the English conventional-commit style of the app repo, with `data` as type and the period name as scope, so the history of the data repo reads per period at a glance.

The starting proposal was `data(2026-2027): 3 edits`. In v01 the edited months were moved into the subject with no body, on the idea that the diff shows the details. In v02 that turned out to make long subjects for large drains (up to twelve months and the settings), so the subject was made short again and bounded, and a body was added only when it says something the subject does not: a split of the edit count per group when more than one group is edited.

A subject is `data(<period>): <n> edit(s) in <where>`:

- `<n>` is the number of patches in the `PUT`, that is the distinct cells written, removals included (a retyped cell replaces its patch in the queue, so it counts once). One edit is `1 edit`, otherwise `edits`.
- `<where>` names a single month by its `YYYY-MM` key, counts several months (`12 months`), and adds `settings` last, joined with `and` when months were edited too.

The five shapes:

```text
data(2026-2027): 1 edit in settings
data(2026-2027): 3 edits in 2026-10
data(2026-2027): 6 edits in 2 months
data(2026-2027): 4 edits in 2026-10 and settings
data(2026-2027): 7 edits in 2 months and settings
```

The last three shapes have a body after a blank line: one plain-text line per group, months in period order then settings, each `<group>: <n> edit(s)`:

```text
data(2026-2027): 7 edits in 2 months and settings

2026-10: 4 edits
2026-11: 2 edits
settings: 1 edit
```

Only "Nouvelle période" has its own subject, `data(2026-2027): create period`, because it is a different call (a `PUT` without `sha`) carrying a whole file rather than patches. "Estimer les relevés" and "Clôturer la période" stay ordinary patches as `docs/period-file.md` already says: they drain with other edits and are counted like them (closing alone reads `1 edit in settings`).

A retried write after a 409 keeps exactly the same message: only the successful attempt becomes a commit, and marking the retry was judged to add nothing.

The format is cheap to change (it affects only future commits), so it gets no ADR. It is recorded in a new "Data commits" section of `docs/architecture.md`, right after "State", where the save queue and `drainQueue()` are described. No glossary term came out of the session: "edit", "group" and the message shapes are implementation, not domain language, and the session deliberately avoided reusing the glossary's **Section** for the body's groups.

## Decision index

- Q1 (v01): English conventional-commit subject with the period as scope, `data(2026-2027): ...`.
- Q2 (v01, reopened in v02 by Q7): no body, edited months listed in the subject. Superseded by Q7.
- Q3 (v01): only "Nouvelle période" has its own subject; estimate and close are ordinary patches, counted as edits and drained with the others.
- Q4 (v01): a retried write after a 409 keeps the same message; nothing marks the retry.
- Q5 (v01): recorded in `docs/architecture.md`, no ADR.
- Q6 (v02): a month is named by its `YYYY-MM` key.
- Q7 (v02): short subject `data(<period>): <n> edit(s) in <where>` with five shapes (settings, one month, several months, settings and one month, settings and several months); a body splits the count per group in every shape but "settings" and "one month".
- Q8 (v02, confirmed by Q8b in v03): months in period order, settings last.
- Q9 (v02): the count is the number of patches in the `PUT`, removals included.
- Q10 (v02): `1 edit`, `2 edits`.
- Q11 (v02): superseded by Q7; a short subject has no long list to cap.
- Q12 (v02): period creation commit is `data(2026-2027): create period`.
- Q13 (v02): a new "Data commits" section after "State" in `docs/architecture.md`.
- Q8b (v03): settings after the months, in the subject and the body.
- Q14 (v03): one month is named: `3 edits in 2026-10`.
- Q15 (v03): several months are counted: `14 edits in 12 months`.
- Q16 (v03): settings join with `and`.
- Q17 (v03): one body line per month and one for settings.
- Q18 (v04): body lines are plain text, `2026-10: 4 edits`, after a blank line.

Superseded: Q2 by Q7 (the subject no longer lists every month, and a body exists), Q11 by Q7 (no long list to cap).

## Decided without grilling

These had to be decided to write this summary; object before they reach `docs/architecture.md`:

- The creation commit has no body, even though it writes settings and twelve months: it carries a whole file, not patches, so there is no edit count to split.
  - Agreed
- Values typed in the "Nouvelle période" form (the monthly tenant bill advance, the heat pump maintenance split) are part of the creation commit, not counted as edits. Edits typed after creation go in later drains with the usual subject.
  - Agreed
- After a 409 rebase, the count stays the number of patches sent, even when the other device had already written the same value in some cells.
  - Agreed

## Paste-ready section for issue #11

Settled in `docs/grillings/2026-11-04-data-commit-messages/`, recorded in the "Data commits" section of `docs/architecture.md`. No ADR, since the format only affects future commits.

- Each drain commit is `data(<period>): <n> edit(s) in <where>`, where `<n>` is the number of patches (distinct cells) in the `PUT` and `<where>` is a single month (`2026-10`), a count of months (`12 months`), `settings`, or one of those followed by `and settings`.
- When the commit touches more than one group (several months, or months and settings), a body lists one line per group, months in period order then settings: `2026-10: 4 edits`.
- "Nouvelle période" commits `data(<period>): create period`. Estimating the readings and closing the period are ordinary edits.
- A retried write after a 409 keeps the same message.
