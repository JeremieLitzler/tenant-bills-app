# Grilling round v07 — when a period is closed (issue #7)

## Settled in v06

Nothing. I missed your v05 section "Remark about the last month of a running period" when I read your answers. I only read the text under each `### Answer to Q<n>` heading. So the v06 summary and its Q30 are withdrawn. `GRILLING-SUMMARY.md` will be rewritten once this branch is settled.

How I read your remark:

1. **Estimate of the last month**: once the eleventh month's readings are in (the July month, read mid-August), the app estimates the twelfth month's readings (August) from the previous period's values. From mid-August, the landlord can communicate the next period's monthly tenant bill advance, so the tenant updates the scheduled transfer before September. That avoids the 2026 situation, where the tenant kept transferring 50 instead of 70.
2. **Closing** still happens when the landlord types the actual August reading (read mid-September). The settlement is then written.
3. **Settlement corrections** still exist, but only because the water consumption and water treatment bills arrive in October. Electricity bills arrive monthly, so electricity is never corrected after closing. Only the ten water pricing keys stay editable.
4. You feel the correction mechanism adds complexity, and you asked what else is superseded.

## Reopened

- **Q13** (nineteen editable keys) and **Q5**'s "pricing of water consumption, treatment and electricity tariff": superseded by point 3. Only the ten water keys stay editable. Re-asked as Q13b.
- **Q3** ("Nouvelle période" refused until the previous period is closed): your reason was that the next advance is only known at closing. With the estimate, it is known from mid-August, so the reason no longer holds. Re-asked as Q3b.
- **Q11** (the gap with no open period) depends on Q3b: if the new period can be created before the close, the gap disappears. Next round.
- **Q12** (prefill of `monthlyTenantBillAdvance` from the closed settlement): the tenant will have set the transfer to the **estimated** advance, which the actual August reading can change. Which figure is prefilled is Q34.
- **Q14 to Q22 and Q26 to Q29** (communicated settlement history, settlement corrections carried into the running period): they exist only because a closed period can still change. If Q3b allows creating the new period first, closing could wait until the water bills arrive in October. Then nothing would change after closing, and this whole mechanism could go. That is Q35, next round, since it depends on Q3b.

Not affected, as far as I can tell: Q6 (closing needs a reading date in every month, and an estimate sets none), Q8, Q9, Q9c, Q10b, Q15, Q16, Q17, Q23, Q24, Q25.

## Q3b - Creating the next period before the close

- a. **Still refused** until the previous period is closed (Q3 stands).
- b. **Allowed** once the previous period's twelfth month is estimated (eleven months read), with the next advance prefilled from the estimate (Q34).

➡️ Recommendation: b. The estimate takes away the reason for Q3, and b removes Q11's gap: the September transfer can be recorded on time. It also lets closing wait for the water bills (Q35), which may remove the correction mechanism you find complex.

### Answer to Q3b

B

## Q13b - Keys still editable on a closed period

Only the ten water pricing keys:

- `waterConsumption`: `pricePerM3`, `resourceWithdrawalFee`, `drinkingWaterFee`, `networkPerformanceFee`, `subscription`, `vat`.
- `waterTreatment`: `collectionConsumptionDistributor`, `collectionConsumptionCommunity`, `sanitationPerformance`, `vat`.

Every electricity key is locked, `tariffMode` and `subscriptionUnit` included. Is that the set?

➡️ Recommendation: yes, as your remark states. If Q35 moves closing after the water bills, this list may end up empty, and Q35 will say so.

### Answer to Q13b

yes

## Q31 - What the twelfth month's estimate copies

The estimate needs a current index for each meter in August. Copying the previous period's August **indexes** makes no sense, because meters only go up. Proposal: for each meter, the estimated August index is July's current index plus the meter's **delta** in the previous period's August month. That covers the water main and studio meters and the electricity registers of the August tariff mode. Prices, occupant counts and the other inherited values are inherited from July as usual.

- a. Previous period's August delta, per meter (as above).
- b. Average monthly delta of the eleven months already read in the running period.

➡️ Recommendation: a. August has its own pattern (summer, holidays), and "previous period values" is what you wrote.

### Answer to Q31

C: use the delta readings from previous period to add on top of the readings made mid-August.

## Q31b - Estimate when there is no previous period

When the previous period's file doesn't exist, or its August delta can't be computed for a meter (for example after a meter replacement or a tariff switch), should the estimate fall back to the average monthly delta of the eleven months already read?

➡️ Recommendation: yes. It still gives an advance in mid-August, and the settlement view says which fallback was used.

### Answer to Q31b

Not appicable. The `monthlyTenantBillAdvance` is communicated on signing of the rental agreement.

## Q32 - Where the estimate lives

- a. **Computed at display, never stored**: the August cells show the estimate, marked "estimé" (italic, like an inherited value). Typing the actual reading replaces it. The file is unchanged until then.
- b. **Written into the file** as August's indexes, and overwritten by the actual reading.

➡️ Recommendation: a. A stored estimate looks exactly like a typed index (ADR 0001: a stored value means "typed for this month"). Closing could then accept estimates as readings. With a, the estimate disappears by itself when you type the reading.

### Answer to Q32

B, in the reading properties of mid-September.

## Q33 - What the estimate shows in the settlement view

While the twelfth month is estimated, the settlement view shows "Régularisation estimée". It shows the estimated balance and the estimated next advance (the exact average and the rounded-up value, as in Q9), labelled as estimates. Is that the display?

➡️ Recommendation: yes. It is the figure you communicate in mid-August, and the label keeps it from being mistaken for the final settlement.

### Answer to Q33

yes

## Q34 - Which advance becomes the next period's

The tenant sets the transfer in mid-August from the estimated advance. At closing, the actual August reading can move CEIL(total tenant shares / 12) by a euro or more.

- a. **The estimated advance**, the one communicated: the next period's `monthlyTenantBillAdvance` is prefilled with it and doesn't follow the actual reading. Any gap ends up in the final balance.
- b. **The advance recomputed at closing**, which the tenant would have to change again.

➡️ Recommendation: a. Asking the tenant to change the transfer twice is exactly what the estimate is meant to avoid. A one-euro error on the advance is caught by the next settlement anyway.

### Answer to Q34

A
