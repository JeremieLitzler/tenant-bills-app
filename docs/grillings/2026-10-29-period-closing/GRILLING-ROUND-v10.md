# Grilling round v10 — when a period is closed (issue #7)

## Settled in v09

- Q4c: the closing marker is `settings.closedOn: "YYYY-MM-DD"`, absent while open, written as an ordinary settings patch. `schemaVersion` stays `1`.
- Q31e: when this year's August is HC/HP, the estimated kWh total of each meter is split at a fixed 30 % HC, 70 % HP.
- Q36: the "Clôturer la période" confirmation requires ticking "Les factures d'eau de la période ont-elles été reçues et saisies ?".
- Q37: once the twelfth month is read and the period isn't closed, the settlement view reminds you to tell the tenant that the final settlement comes in October, when the water bills arrive.

The frontier is empty. `GRILLING-SUMMARY.md` is rewritten: it replaces the withdrawn v06 summary.

## Q38 - Does the summary match your understanding?

Read `GRILLING-SUMMARY.md`, especially its last section, "Decided without grilling, please check". Corrections there edit the summary in place. Once you confirm, I write ADR 0006, amend ADRs 0001 and 0002, update `docs/period-file.md`, and create the two follow-up issues. The glossary is already updated.

➡️ Recommendation: yes, if every line of the decision index reads as what you meant.

### Answer to Q38

yes
