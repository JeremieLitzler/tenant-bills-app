# Grilling round v11 — period file JSON shape (issue #5)

## Settled in v10

- Q50b / Q50c: the updated sheet fixes both. September 2025's main meter runs 403990 > 418709, and the softened studio meter runs 1968 > 2944 in October 2025.
- Q51: estimated readings carry no mark in the file.
- Q41i: the setting is `settings.monthlyTenantBillAdvance` (`period-model-schema.json` updated).

The frontier is empty. I wrote `GRILLING-SUMMARY.md` in this folder and `docs/adr/0005-one-period-file-with-twelve-fixed-months.md`.

## Q52 - Does the summary match your understanding?

Read `GRILLING-SUMMARY.md`, especially "Not grilled, decided to write the artefacts" (five points decided without a question) and the paste-ready section for issue #5.

a. Yes, it matches.
b. No: write the corrections. I edit the summary in place, and open a new round only if a correction reopens a decision.

➡️ Recommendation: a, once the five unquestioned points look right to you.

### Answer to Q52

summary annotated.

(Applied in `GRILLING-SUMMARY.md`: `cta` > `ctaTax` added to the renames, the heat pump split offered on new period creation, `<meter-name>Previous` wording, and the golden record pointed to issue #6. No decision reopened.)
