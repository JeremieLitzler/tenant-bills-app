# Grilling round v03 — Data commit messages (issue #11)

## Settled in v02

- Q6: wherever a month is named, it is the `YYYY-MM` key of the file (`2026-10`).
- Q7: the subject stays short: `data(2026-2027): <n> edit(s) in <where>`, where `<where>` is one of five shapes: settings, one month, several months, settings and one month, settings and several months. A body splits the edit count per group whenever more than one group is edited, that is in every shape except "settings" and "one month". This reopens Q2 (see below).
- Q8: months in period order (September first), settings after the months. This order now conflicts with the shapes of Q7, which put settings first; see Q8b.
- Q9: the count is the number of patches in the `PUT`, that is the distinct cells written, removals included.
- Q10: `1 edit`, `2 edits`.
- Q11: superseded by Q7; with a short subject, a long list no longer arises.
- Q12: the period creation commit is `data(2026-2027): create period`.
- Q13: the format goes in a new "Data commits" section of `docs/architecture.md`, after "State".

## Reopened

- Q2 (v01 settled "no body, months listed in the subject"): reopened by Q7. There is now a body when more than one group is edited, and the subject no longer lists every month. Q14 to Q16 finish the subject; the body's content is Q17 and its line format comes in the next round.
- Q8 (settled "settings last"): the shapes you wrote in Q7 read "settings and one month", settings first. Re-asked as Q8b.

## Q8b - Settings before or after the months

Both apply to the subject and to the body lines.

- a. Settings first, as you wrote in Q7: `3 edits in settings and 2026-10`.
- b. Settings last, as settled in Q8: `3 edits in 2026-10 and settings`.

➡️ Recommendation: b. The body then reads in the order of the table (months left to right, the settings form apart), and Q8 stays as answered; your Q7 wording looked like a list of cases rather than an order. Pick a if you meant the order.

### Answer to Q8b

B

## Q14 - "One month" in the subject

When every patch is in a single month:

- a. The month is named: `data(2026-2027): 3 edits in 2026-10`.
- b. Only the fact that it is one month: `data(2026-2027): 3 edits in one month`.

➡️ Recommendation: a. It costs seven characters, there is no body in that case (Q7), so without the name the commit would not say where it wrote, apart from the diff.

### Answer to Q14

A

## Q15 - "Several months" in the subject

When the patches span two months or more:

- a. The number of months: `data(2026-2027): 14 edits in 12 months`.
- b. The first and last month: `data(2026-2027): 5 edits in 2026-10 to 2026-12`.
- c. The literal words: `data(2026-2027): 5 edits in several months`.

➡️ Recommendation: a. It stays short whatever the drain, says more than c, and the body (Q17) names each month; b suggests every month in between was edited.

### Answer to Q15

A

## Q16 - Joining settings with months

- a. `and`: `4 edits in 2026-10 and settings`, `14 edits in 12 months and settings`.
- b. A comma: `4 edits in 2026-10, settings`.

➡️ Recommendation: a. It is the wording you used in Q7 and it reads as a sentence.

### Answer to Q16

A

## Q17 - What a body line groups by

You wrote "split of edits count per section". In `GLOSSARY.md`, a **Section** is one kind of charge (water consumption, water treatment, electricity, water softener, internet, heat pump maintenance), and the subject's groups are months and settings. Which split do you mean?

- a. One line per group of the subject, that is per month and one for settings: `2026-10: 3 edits`.
- b. One line per glossary Section (plus `common` and settings), whatever the month: `electricity: 6 edits`.
- c. One line per month, each split per Section: `2026-10: 3 edits (electricity 2, common 1)`.

➡️ Recommendation: a. The body then completes exactly what the subject summarised ("in 12 months" becomes the twelve months), and it avoids reusing the glossary's word "section" for something else. If you meant b or c, the glossary term fits and the body names the sections by their file keys.

### Answer to Q17

A
