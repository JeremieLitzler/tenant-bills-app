# Implementation feedback summary - issue 117 (domain types and validation to schemaVersion 2)

## Shared understanding

Commit `2d005b4` moved the period file types, `validatePeriodFile` and the period table to `schemaVersion: 2` and deleted `inheritance.ts`. The code review found no defect, only judgment calls. All ten were settled in round v01, almost all as recommended. Four small code changes follow (one list of section names, a named table reader, the validation rules reported independently, a leaner test helper), plus one line added to `docs/period-file.md` so the doc and the code agree on the `month` shape. The "settings" wording in `docs/architecture.md` is left alone: it belongs to the documentation impact of the parent #106 and should already have been handled there.

Decided without being asked (not objected to in round v01): the `common.windowStart` row is gone and "Du" reads `common.startDate`; the `tenant-bill-advance` problem is removed; `validatePeriodFile` no longer takes the period id; the italic and grey styling of inherited and derived cells is removed. The manual check of `periods/2025-2026.json` against the data repo is still to do.

## Decision index

- Q1, v01: the section names of the validation come from `Object.keys(FIELD_CATALOGUE)`.
- Q2, v01: the stored-value reader of `input()` becomes a named function `storedValue(file, month, section, key)` in `periodLines.ts`.
- Q3, v01: keep `Resolved` and `Provenance`.
- Q4, v01: remove `closedOn: undefined` from `tests/helpers/periodFile.ts`.
- Q5, v01: keep the `YYYY-MM` format check, and add it to the "Validation" list of `docs/period-file.md`.
- Q6, v01: the sections check runs independently of the months check (every broken rule reported), with a test.
- Q7, v01: keep "Un mois n'a pas ses sept sections."
- Q8, v01: keep the new `months` notice.
- Q9, v01: keep the new `schema-version` notice.
- Q10, v01: leave "settings" in `docs/architecture.md`.

## Rejected alternatives

- Q1: a local list typed `SectionName[]`, and keeping the untyped list.
- Q2: keeping the one-expression reader.
- Q3: removing `Resolved` and `Provenance` in favour of `line.computed`.
- Q4: keeping the `closedOn` cast in the helper.
- Q5: dropping the format check.
- Q6: keeping the sections check behind `else if`.
- Q7 to Q9: another wording.
- Q10: rewording "settings" in this branch.
