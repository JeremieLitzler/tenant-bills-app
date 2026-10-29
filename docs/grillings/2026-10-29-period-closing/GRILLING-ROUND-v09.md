# Grilling round v09 — when a period is closed (issue #7)

## Settled in v08

- Q31 (from v07): you didn't object to my reading of "C". The estimated August index of each meter is July's current index plus that meter's delta in the previous period's August.
- Q31c: with no previous period, the estimate uses the delta of the **July** month, not an average. This supersedes Q31b.
- Q31d: the estimate works in kWh per meter, whatever the tariff mode. If last year's August, or this year's July in the fallback, was HC/HP, its delta is HC + HP. How that total becomes this year's registers is Q31e.
- Q32b: August is estimated while it holds indexes but no `common.readingDate`. Typing the reading date makes it read. The estimate's "Au" for per-day subscriptions is the suggested reading date, which is not stored. The confirmation of the actual reading lists the indexes still equal to their estimate.
- Q32c: a button on the twelfth month, "Estimer les relevés", writes the estimate as ordinary patches. It is enabled once the eleventh month has its reading date.
- Q12b: as I read your "No": "Nouvelle période" prefills `monthlyTenantBillAdvance` with the figure the previous period's settlement shows at that moment, still editable, with no extra mechanism to keep the communicated figure. A one-month difference barely moves it, so a mechanism waits until it becomes a real problem. Tell me if "No" meant something else.
- Q35: a period is closed **once the water bills are in** (October), not at the August reading. Until then, it stays open and "provisoire". After closing, nothing is editable. You also want a message on the provisional settlement reminding you to tell the tenant that the settlement comes in October (Q37).

Glossary: **Closed period** reworded (nothing changes after closing). **Communicated settlement** removed. **Estimated month** (_Mois estimé_) and **Estimated settlement** (_Régularisation estimée_) added.

## Reopened

Q35 b withdraws a whole branch:

- **Q14, Q18 to Q22, Q26 to Q29**: no history of communicated settlements, no settlement correction, no write across two period files. ADR 0001 needs no exception for stored balances, and ADR 0004 stays as it is. Q15 (the next period after a late price correction) is moot.
- **Q13b**: the list of keys editable after closing is now **empty**. Q2's lock is total again, and Q7b (the lock covers `settings`) stands.
- **Q4b** ("no `closedOn`, the history decides"): without a history, closing needs its marker back. Re-asked as Q4c.
- **Q23** (the import's first history entry): gone. The imported 2025-2026 only gets its closing marker (Q17, settled 2026-09-12).
- **Q32** (estimate stored as indexes) is the one exception left for ADR 0001: a stored August index without a reading date is an estimate, not a typed value.

Still standing: Q1, Q2, Q5 (no reopening), Q6, Q8, Q9, Q9c, Q10b, Q16, Q17, Q24, Q25, Q33, Q34.

## Q4c - The closing marker

Back to Q4's option: `settings.closedOn: "YYYY-MM-DD"`, the date "Clôturer la période" was pressed, absent while open, written as an ordinary settings patch. `schemaVersion` stays `1`. Is that the marker?

➡️ Recommendation: yes. It was your first choice (Q4), and the only reason to drop it (the history) is gone.

### Answer to Q4c

yes

## Q31e - Splitting an estimated kWh total into this year's registers

This year's August is HC/HP, and the estimate gives a total, for example 180 kWh for the studio meter. The app must write one estimated index per register, `studioHc` and `studioHp`. How is the total split?

- a. In July's HC/HP proportion for that meter (July: 40 % HC > 72 HC, 108 HP).
- b. In the proportion of every month already read in HC/HP this period.

In Base, the whole total goes to the Base register, with no split.

➡️ Recommendation: a. July is the month closest to August. It also matches Q31c, where July is the fallback anyway.

### Answer to Q31e

Use a "30% (HC) - 70 % (HP)" ratio

## Q36 - Closing once the water bills are in

The app can't tell whether you have typed the October water bills' prices. Should the "Clôturer la période" confirmation ask "Les factures d'eau de la période ont-elles été reçues et saisies ?", with a checkbox that must be ticked, on top of Q6's checks?

➡️ Recommendation: yes. It's the one condition Q35 adds, and nothing else in the file can check it. Since a closed period can't be reopened (Q5), it is worth asking.

### Answer to Q36

yes

## Q37 - The reminder on the provisional settlement

Proposal: once the twelfth month is read (it has its reading date) and the period isn't closed yet, the settlement view shows a banner:

> Relevé d'août saisi. Prévenez le locataire que la régularisation définitive sera communiquée en octobre, à réception des factures d'eau.

Is that when and what it shows?

➡️ Recommendation: yes. That's when the provisional figure looks final but isn't. Before the August reading, the "Régularisation estimée" label (Q33) already says the figure will move.

### Answer to Q37

yes
