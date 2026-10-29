# Grilling summary — when a period is closed (issue #7)

Session started 2026-10-29, rounds v01 to v10. The v06 summary was withdrawn: I had missed your v05 remark "Remark about the last month of a running period", which changed the outcome. Glossary terms added along the way: **Closed period**, **Running period**, **Provisional settlement**, **Estimated month**, **Estimated settlement**.

## Shared understanding

The settlement view is "provisoire" for any open period (functional breakdown Q25). This session decided what closes a period, and how the next period's monthly tenant bill advance is known in time.

**Closing is an explicit act, not a state derived from the data.** Issue #7's working assumption was "all twelve reading dates entered". It was dropped because a closed settlement is a figure handed to the tenant, and some bills arrive after the last reading. "Clôturer la période" is enabled when every month has a reading date and every tenant share is computable (Q6). Its confirmation lists months whose tenant bill advance is `0`, without blocking. It also requires ticking "Les factures d'eau de la période ont-elles été reçues et saisies ?" (Q36). Closing writes `settings.closedOn: "YYYY-MM-DD"`, an ordinary settings patch, absent while the period is open; `schemaVersion` stays `1` (Q4c).

**A period is closed once the water bills are in, in October, not at the August reading (Q35).** This is the main turn of the session. For four rounds, closing happened at the August reading. Because the October water bills could still change prices, that design grew a versioned history of communicated settlements, corrections carried into the running period, a write across two period files, and exceptions to ADR 0001 and ADR 0004. Your v05 remark showed where the pressure came from: the next advance was only known at closing, so closing had to come early. Once the advance can be estimated in mid-August (below), closing can wait for the water bills. Then nothing changes after closing, and the whole correction branch was withdrawn (Q14, Q18 to Q22, Q26 to Q29).

**A closed period is fully locked and can't be reopened.** Every cell and every setting is read-only (Q2, Q7b), and there is no "Rouvrir la période" (Q5). The lock is a UI rule. A patch queued on another device before the close reached the file still applies, and the app flags it (Q8).

**The last month is estimated so the next advance is known in mid-August.** This avoids a repeat of 2026, when the new advance (70 instead of 50) came out in September, and the tenant only updated the transfer in October. That shortfall is the 20 € in the 256.31 communicated for 2025-2026, which also corrects ADR 0002's rationale (Q24). Once the eleventh month (July) has its reading date, an "Estimer les relevés" button on the twelfth month writes estimated indexes (Q32, Q32c). Each meter gets July's current index plus that meter's kWh or litre delta in the previous period's August (Q31), or in this year's July when there is no previous period (Q31c). The delta is a total per meter: HC + HP when the source month was HC/HP (Q31d). When this year's August is HC/HP, the total is split 30 % HC, 70 % HP (Q31e). August is an **estimated month** while it holds indexes but no reading date. Typing the reading date makes it read, and the confirmation lists the indexes still equal to their estimate (Q32b). The estimate's "Au", for per-day subscriptions, is the suggested reading date, which is not stored. While August is estimated, the settlement view shows "Régularisation estimée", with the estimated balance and next advance (Q33). Once August is read but the period isn't closed yet, a banner reminds you to tell the tenant that the final settlement comes in October, when the water bills arrive (Q37).

**The next advance and the next period.** The next monthly tenant bill advance is the total tenant shares / 12, rounded **up** to the euro (Q9c, Excel now `ROUNDUP`). The settlement view shows it with the exact average (Q9). "Nouvelle période" is allowed once the previous period's twelfth month is estimated (Q3b), and freely when the previous period's file doesn't exist (Q10b). So the September transfer is never left without a period to record it (Q11 no longer applies). It prefills `monthlyTenantBillAdvance` with the next advance the previous settlement shows at that moment, still editable (Q12b, Q34). That is the one exception to functional breakdown Q21's "no prefill in v1". It is not updated afterwards.

**2025-2026 is imported**, which reverses functional breakdown Q22, so that 2026-2027 has a previous period. A one-off, non-randomized mode of `scripts/extract-golden.py` writes the file to this repo's root, gitignored, and you upload it to the data repo (Q16). It is closed with `settings.closedOn: "2026-09-12"` (Q17). Paying a settlement in instalments, which you offered the tenant for 2025-2026, stays outside the app in v1 (Q25).

## Decision index

- Q1 (v01): a period is closed by an explicit "Clôturer la période" action, not derived from the data.
- Q2 (v01): a closed period is locked; every cell is read-only.
- Q3b (v07): "Nouvelle période" is allowed once the previous period's twelfth month is estimated.
- Q4c (v09): the closing marker is `settings.closedOn: "YYYY-MM-DD"`, absent while open.
- Q5 (v02): a closed period can't be reopened.
- Q6 (v02): closing needs a reading date in every month and every tenant share computable; `0` advances are listed, not blocking.
- Q7b (v03): the lock covers `settings`; future settings are decided key by key.
- Q8 (v02): a patch queued before the close reached the file applies as usual and is flagged.
- Q9 (v02): the settlement view shows the exact average and the rounded next advance.
- Q9c (v03): the next monthly tenant bill advance is rounded up to the euro; Excel uses `ROUNDUP`.
- Q10b (v03): the previous-period check applies only when that period's file exists.
- Q12b (v08): "Nouvelle période" prefills `monthlyTenantBillAdvance` with the next advance shown at that moment, editable, never updated afterwards.
- Q16 (v03): 2025-2026 is imported by a non-randomized mode of `extract-golden.py`, writing a gitignored file at the repo root; details in a follow-up issue.
- Q17 (v03): the imported 2025-2026 is closed on 2026-09-12.
- Q24 (v05): ADR 0002's rationale is reworded: the -20 was the tenant's late transfer change, not the overlap.
- Q25 (v05): settlement payments, including instalments, are not recorded in v1; follow-up issue.
- Q31 (v07): the estimated index is July's current index plus the meter's delta in the previous period's August.
- Q31c (v08): with no previous period, the delta is this year's July's.
- Q31d (v08): the delta is a total per meter; HC + HP when the source month was HC/HP.
- Q31e (v09): an HC/HP August splits the estimated total 30 % HC, 70 % HP.
- Q32 (v07): the estimate is written into August's index keys.
- Q32b (v08): August is estimated while it has indexes but no reading date; the reading date makes it read.
- Q32c (v08): an "Estimer les relevés" button writes the estimate, enabled once the eleventh month has its reading date.
- Q33 (v07): while August is estimated, the settlement view shows "Régularisation estimée".
- Q34 (v07): the next period's advance is the estimated one communicated in mid-August.
- Q35 (v08): a period is closed once the water bills are in (October); nothing is editable after closing.
- Q36 (v09): the closing confirmation requires ticking that the water bills were received and typed.
- Q37 (v09): once August is read and the period isn't closed, a banner reminds you to tell the tenant the settlement comes in October.

Superseded: Q3 by Q3b (the estimate gives the next advance before closing). Q4 and Q4b by Q4c (`closedOn` dropped for a history, then restored when the history went). Q7 by Q7b. Q9b (`ROUND`) by Q9c (`ROUNDUP`). Q10 by Q10b. Q11 by Q3b (no gap left). Q12 by Q12b. Q13 and Q13b by Q35 (nothing stays editable). Q31b by Q31c. Q14, Q15, Q18 to Q23 and Q26 to Q29 were withdrawn by Q35 (no history of communicated settlements, no settlement correction). Q30 (v06) was withdrawn with the v06 summary. Outside this session: functional breakdown Q21 (no prefill in v1) is narrowed by Q12b, Q22 (no import) is reversed by Q16, and Q25's "until closed" is now defined.

## For issue #7

Paste-ready:

> Settled in `docs/grillings/2026-10-29-period-closing/` (rounds v01 to v10).
>
> - **Closing rule**: explicit "Clôturer la période", once the water bills are in (October). Enabled when every month has a reading date and every tenant share is computable. The confirmation lists months with a `0` advance and requires ticking "factures d'eau reçues et saisies".
> - **Field**: `settings.closedOn: "YYYY-MM-DD"`, absent while open. `schemaVersion` stays 1.
> - **Reopening**: not possible.
> - **Edits to a closed period**: locked, `settings` included. A patch queued before the close applies and is flagged.
> - **Next advance in time**: once July is read, "Estimer les relevés" estimates August from last year's August deltas (or this July's), so the next advance (CEIL(total tenant shares / 12)) can be communicated in mid-August. "Nouvelle période" is allowed from then on and prefills it.
> - **Recorded in**: ADR 0006, amended ADRs 0001 and 0002, `docs/period-file.md`, `GLOSSARY.md`.
> - **Follow-ups**: #18 import of 2025-2026 (closed on 2026-09-12); #19 settlement paid in instalments; #20 estimating any month (not v1).

## Decided without grilling, please check

These had to be settled to write the outcome down. Object to any of them before I write the docs:

- **A new ADR 0006**, "A period is closed explicitly once its water bills are in, and its last month is estimated to give the next advance early". It meets the bar: surprising without context (no reopening, closing a month after the last reading, estimates stored as indexes), hard to reverse (the file meaning of an index without a reading date), and the result of a real trade-off (the correction history it replaced is described there as the rejected option).
  - OK
- **ADR 0001** gets one paragraph: in the twelfth month, indexes stored without a `readingDate` are estimates, not typed values. **ADR 0002**'s last sentence is reworded as in Q24. **ADR 0004 is not changed.**
  - OK
- **`docs/period-file.md`** gets `settings.closedOn`, the closed-period lock, and the estimated twelfth month (indexes without `readingDate`). Validation: a `closedOn` that isn't a `YYYY-MM-DD` date opens the file read-only.
  - OK
- **The 30/70 ratio** (Q31e) is a constant in the code in v1, not a period setting.
  - That's a reasonnable figure from 10 years of readings
- **The estimate applies only to the twelfth month.** "Estimer les relevés" doesn't exist on other months.
  - Add a grilling ticket to add the estimate feature for all the months. Not needed in v1.
- **"Nouvelle période" is also allowed when the twelfth month is read**, not only estimated. That covers the case where you skip the estimate and type the actual August reading.
  - yes
- **When the previous August's delta is missing for a meter**, for example a register that didn't exist then, that meter falls back to this year's July delta, as in Q31c.
  - yes
- **Two open periods can coexist** from mid-August to October (the old one waiting for its water bills, the new one running). The `/` redirect still goes to the period containing today, which is the new one from September.
  - Yes
- **Two follow-up issues** to create, labelled `needs-triage`: the 2025-2026 import (Q16, Q17), and recording settlement payments in instalments (Q25).
- **Functional breakdown Q21, Q22 and Q25** are not edited in place. This summary is where they are narrowed, reversed and defined.
  - OK
