# Grilling round v04 — Data commit messages (issue #11)

## Settled in v03

- Q8b: settings come after the months, in the subject and in the body; Q8 stands.
- Q14: a single month is named in the subject: `data(2026-2027): 3 edits in 2026-10`.
- Q15: several months are counted in the subject: `data(2026-2027): 14 edits in 12 months`.
- Q16: settings join with `and`: `4 edits in 2026-10 and settings`, `14 edits in 12 months and settings`.
- Q17: the body has one line per group of the subject, that is one per month and one for settings.

## Q18 - Body line format

The body follows the subject after a blank line, one line per group, months in period order then settings, with the count pluralised as in Q10. Example for a drain of four edits in October, two in November and the close:

```text
data(2026-2027): 7 edits in 2 months and settings

2026-10: 4 edits
2026-11: 2 edits
settings: 1 edit
```

- a. As above: `<group>: <n> edit(s)>`.
- b. As a Markdown list: `- 2026-10: 4 edits`.

➡️ Recommendation: a. Git shows the body as plain text and GitHub does not render commit bodies as Markdown, so the dash adds nothing, and a mirrors the subject's wording.

### Answer to Q18

A
