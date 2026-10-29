# Grilling round v06 — when a period is closed (issue #7)

## Settled in v05

- Q24: ADR 0002's rationale is reworded: the -20 "Réajustement" was the tenant's late change of their transfer, not the 13-month overlap. The decision itself stands.
- Q25: v1 records no settlement payment; a follow-up issue covers paying in instalments.
- Q26: recording a correction is refused when there is no running period ("Créez d'abord la période suivante").
- Q27: `common.previousPeriodSettlementsDelta` is read-only in the UI, non-inherited, with the balance's sign, absent in months without a correction.
- Q28: settlement corrections stay out of "Nouvelle annualisation".
- Q29: the glossary term is **Settlement correction** (_Correction de régularisation_).

The frontier is empty. The shared understanding, the decision index, a paste-ready section for issue #7, and the points I had to decide without grilling are in `GRILLING-SUMMARY.md`.

## Q30 - Does the summary match your understanding?

Read `GRILLING-SUMMARY.md`, especially its last section, "Decided without grilling, please check". Corrections there edit the summary in place. Once you confirm, I write ADR 0006, amend ADRs 0001, 0002 and 0004, update `docs/period-file.md` and `GLOSSARY.md`, and create the two follow-up issues.

➡️ Recommendation: yes, if every line of the decision index reads as what you meant.

### Answer to Q30
