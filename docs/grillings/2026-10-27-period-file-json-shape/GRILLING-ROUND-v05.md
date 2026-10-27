# Grilling round v05 — period file JSON shape (issue #5)

## Settled in v04

- Q21: a settings patch is `{ period, month: null, field: "settings.<key>", value }`; queue key `null|settings.<key>`.
- Q22: the formulas read only the keys of the month's `tariffMode`; the other mode's keys stay in the file, ignored, and show again if the mode switches back.
- Q23: the `...Previous` keys of a tariff mode are allowed in the month where `tariffMode` differs from the previous month's.
- Q24: a `...Previous` key is allowed in any month for a replaced meter, entered only through an explicit "Compteur remplacé" action.
- Q25: a higher `schemaVersion`, an unknown section or key, or a wrongly typed value makes the period read-only with the list of problems; every write to it is refused.
- Q26: a new file holds `schemaVersion`, `period`, `settings` with both keys required (typed in the creation dialog), and `"months": {}`.
- Q27: two-space indent, top-level order `schemaVersion`, `period`, `settings`, `months`; months chronological; sections and keys in the Q19 catalogue order; one trailing newline.

## Reopened

- Q5 said the `...Previous` keys are refused by validation outside the first month. Q23 and Q24 allow them in other months, so the rule moves from the file to the UI. Q28 confirms where it lives now.

## Q28 - Where the "previous index only in some months" rule lives

Because of Q24, a valid file can hold a meter's `...Previous` key in any month, and nothing in the file says whether it came from a tariff switch or a meter replacement: the key itself is the record.

a. The file accepts `...Previous` meter keys in any month (Q25 does not flag them). The UI shows a previous-index line as editable only in the first month, in a tariff switch month (Q23) for that mode's registers, and in a month where the meter already has a `...Previous` key or "Compteur remplacé" was used (Q24). `readingDatePrevious` stays first-month-only in the file.
b. The file also stores a flag, `"<meter>Replaced": true`, and Q25 refuses a `...Previous` key outside month 1 without either a tariff switch or that flag.

➡️ Recommendation: a. The `...Previous` key already says "this month starts from a different index"; a flag would be a second key that must agree with it, and Q17 cleanup would need to remove both. Q5's intent (read-only by default) is kept by the UI.

### Answer to Q28

A
