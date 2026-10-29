# Grilling round v05 — when a period is closed (issue #7)

## Settled in v04

- Q4b: `settings.closedOn` is dropped. A period is closed when its history holds at least one entry, and the closing date is the first entry's date.
- Q18: the history is `settings.communicatedSettlements`, an array in date order, absent while the period is open. It is patched whole and only ever appended to.
- Q19: an entry holds `date`, `balance` and a free-text `note`, and nothing else (no per-section snapshot).
- Q20: a new entry is recorded by an explicit action, "Enregistrer la régularisation communiquée", with a required note. It is enabled when the current balance differs from the last entry.
- Q21: `common.previousPeriodSettlementsDelta` sits in the month of the running period whose window contains the entry's date. Several corrections in the same month add up in that key.
- Q22: recording an entry queues two patches, one per period file. The drain sends one `PUT` per file, one after the other. ADR 0004 is amended to "one `PUT` per file at a time".
- Q23: for now, the import writes the app's computed 2025-2026 balance as the first entry. Its note says 256.31 was communicated. Your explanation of the gap: the 2025-2026 balance was 236.31 owed by the tenant. The +20 was September 2026's shortfall: the new advance was 70, but she kept transferring 50 until October 2026. Paying the settlement in instalments was offered; that's out of scope here (Q25).

Glossary: I added **Running period** (_Période en cours_) and **Communicated settlement** (_Régularisation communiquée_), and reworded **Closed period**.

## Reopened

- **ADR 0002's rationale** (functional breakdown Q2): ADR 0002 says the 13-month overlap "forced a manual 'Réajustement' line in the settlement". Your Q23 explanation says the -20 was September 2026's shortfall in the tenant bill advance, not the overlap. That's Q24.

Facts I looked up:

- Under the sheet's sign (`N6 > 0`: the landlord owes the tenant), "the tenant owed 236.31" is a balance of **-236.31**. The `256.31` in Q18's example should have been `-256.31`.
- In the app, the September 2026 shortfall needs no adjustment line. 2026-2027's first month stores `tenantBillAdvance: 50` against an expected 70, so the running balance of 2026-2027 already carries it.

## Q24 - Correcting ADR 0002's rationale

The decision in ADR 0002 (twelve months, September to August) stands. Only its explanation of the "Réajustement" line is wrong. Should ADR 0002's last sentences be reworded to say that the -20 was a late change of the tenant's transfer, which the app records naturally as the 2026-2027 September advance? The current claim, that the overlap forced the line, would go.

➡️ Recommendation: yes. An ADR states why a decision was taken, and a wrong why misleads the next reader into thinking twelve months removes the need for any adjustment. The decision itself doesn't change, so a rewording is enough; no superseding ADR.

### Answer to Q24

yes

## Q25 - Payment of the settlement

Today, nothing in the app records the tenant paying (or the landlord refunding) a communicated balance. The balance is communicated and settled outside the app. Should v1 stay that way, with a follow-up issue (`needs-triage`) for paying a settlement in instalments over the next months?

➡️ Recommendation: yes. Recording payments brings new inputs and new balances, which is a design of its own. The 2025-2026 case, where the tenant pays in chunks, gives that issue its first concrete example.

### Answer to Q25

yes

## Q26 - Recording a correction with no running period

Q11 accepts a gap with no open period: between the last reading of one period and its closing, while the next period doesn't exist yet. If you record a correction on an older closed period during that gap, there is no running period to carry the difference into. Should "Enregistrer la régularisation communiquée" be refused then, with "Créez d'abord la période suivante"?

➡️ Recommendation: yes. The difference has to land somewhere the tenant pays it, and the gap is short by design (Q11).

### Answer to Q26

Yes

## Q27 - Editing `previousPeriodSettlementsDelta` by hand

Should `common.previousPeriodSettlementsDelta` be read-only in the table and in "Saisie du mois", and be written only by recording an entry?

➡️ Recommendation: yes. It must equal the difference between two entries of another file. A hand edit would break that link silently. In the file it is non-inherited (N), with the balance's sign, and absent in months without a correction.

### Answer to Q27

yes

## Q28 - The carried difference and the next advance

The carried difference counts in the running period's balance. Should it stay **out** of that period's "Nouvelle annualisation" (total tenant shares / 12, rounded up)?

➡️ Recommendation: yes. It is a one-off catch-up on an older period, not a charge that will repeat next year. Putting it in the average would raise or lower twelve future advances because of one late bill.

### Answer to Q28

yes

## Q29 - A name for the carried difference

The key is `previousPeriodSettlementsDelta`, but the glossary has no term for the thing it holds. Should it be **Settlement correction** (_Correction de régularisation_): "the difference between two communicated settlements of a closed period, carried into the running period's settlement"? The settlement view would label its line "Correction de régularisation 2025-2026".

➡️ Recommendation: yes. "Delta" is a code word. "Correction" says what happened to the tenant: an earlier settlement was corrected. It also avoids "Réajustement", which the sheet used for something else.

### Answer to Q29

yes

## Remark about the last month of a running period

It seems that there is unnecessary complexity in this grilling because of the "settlement adjustment" and the fact that until we know the actual reading at the end of the month, the `monthlyTenantBillAdvance` reevaluation is difficult.

Verify this following algorhythm: once the 11th month reading's are in, app fills up the 12th month readings from the previous period values as an estimate. That way, from the beginning of the 12th (mid-August), the landlord can communicate the next period `monthlyTenantBillAdvance` so the tenant can update the scheduled bank transfer.

When the closing happens, the landlord inputs the actual reading and the settlement is written.

The settlement adjustment can still exists because the landlord doesn't receive the water consumption and treatment bills until October. Electricity bill are received monthly. So only the following properties can change on a settlement adjustment:

- `waterConsumption`: `pricePerM3`, `resourceWithdrawalFee`, `drinkingWaterFee`, `networkPerformanceFee`, `subscription`, `vat`.
- `waterTreatment`: `collectionConsumptionDistributor`, `collectionConsumptionCommunity`, `sanitationPerformance`, `vat`.

So at least Q13 is therefore superseded.

Tell me what else is superseded and what are the new question.

Challenge the fact that this is simpler as well.
