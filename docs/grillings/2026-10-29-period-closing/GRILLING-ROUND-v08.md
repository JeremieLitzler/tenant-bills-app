# Grilling round v08 — when a period is closed (issue #7)

## Settled in v07

- Q3b: "Nouvelle période" is allowed once the previous period's twelfth month is estimated, with the next advance prefilled from the estimate. This supersedes Q3. As a result, Q11's gap disappears: the September transfer can be recorded on time.
- Q13b: on a closed period, only the ten water pricing keys stay editable (`waterConsumption`: `pricePerM3`, `resourceWithdrawalFee`, `drinkingWaterFee`, `networkPerformanceFee`, `subscription`, `vat`; `waterTreatment`: `collectionConsumptionDistributor`, `collectionConsumptionCommunity`, `sanitationPerformance`, `vat`). This supersedes Q13. Q35 below may still empty the list.
- Q31: the estimated August index of each meter is the index read mid-August (July's current index) plus that meter's delta in the previous period's August month. You answered "C", but as I read it, this is what a described: "the reading made mid-August" is July's current index. Tell me if you meant something else, for example the deltas of every month, not just August.
- Q33: while the twelfth month is estimated, the settlement view shows "Régularisation estimée", with the estimated balance and the estimated next advance (exact and rounded up), both labelled as estimates.
- Q34: the next period's `monthlyTenantBillAdvance` is the **estimated** advance, the one communicated in mid-August. It doesn't follow the actual reading, and any gap ends up in the next settlement.

## Reopened

- **Q31b** (estimate with no previous period): your answer is "not applicable, the advance is communicated on signing of the rental agreement". The lease sets the advance of a tenant's **first** period. The estimate computes the advance of the **next** period, which the lease doesn't set. Re-asked as Q31c with a concrete case.
- **Q32** (where the estimate lives): you chose b, the estimate written into August's reading keys, the ones typed mid-September. That makes the estimate a stored value, so the file must tell an estimate apart from an actual reading. That's Q32b, and who writes it is Q32c. ADR 0001 ("a stored value means typed") gets an exception either way.
- **Q12** (prefill at creation): Q34 fixes the figure as the estimated advance, but the new period can be created at any time after the estimate, even after the actual reading has changed it. That's Q12b.

Facts I looked up:

- The electricity supplier changed in August 2026 (functional breakdown summary), so the tariff mode can differ between one August and the next. The previous August's delta then exists for registers the running period doesn't use.
- Electricity with `subscriptionUnit: "day"` bills the number of days between "Du" and "Au". An estimated August has no "Au" (`readingDate`) until mid-September.

## Q31c - Estimate when there is no previous period

Example: a new tenant signs in September 2028 at 60 €/month, for 2028-2029. In mid-August 2029, you want 2029-2030's advance, but no 2027-2028 file exists for that tenant (or at all), so there's no previous August delta. Should the estimate then fall back to the average monthly delta of the eleven months already read in 2028-2029?

- a. **Yes**, the average fallback, with the settlement view naming it ("estimation : moyenne des 11 mois").
- b. **No estimate**: the next period waits for the actual August reading (Q3's old rule, for that case only).

➡️ Recommendation: a. It keeps one routine for every year, and the actual reading corrects it at closing.

### Answer to Q31c

Use delta from July's reading.

## Q31d - Estimate across a tariff switch

The previous August was in Base, and this year's July is in HC/HP (or the other way round), so the previous August's per-register delta doesn't match this year's registers. Should the estimate take the previous August's **total** kWh delta per meter and split it between HC and HP in the proportion of the months already read in the current mode?

➡️ Recommendation: yes. The total consumption is what repeats from one August to the next, and the HC/HP split is what the current contract shows. Base to Base or HC/HP to HC/HP keeps the per-register delta of Q31.

### Answer to Q31d

Whether it is Base tariff or HP/HC tariff, the value we want are kWh so sum HP+HC if last year's period used HP/HC tariff. Same if there is no previous period and July used HP/HC tariff

## Q32b - Telling an estimate from a reading

With the estimate stored in August's index keys:

- a. **The reading date decides**: August is estimated while it holds indexes but no `common.readingDate`. Typing the reading date makes it read. Closing still needs a reading date in every month (Q6). The estimate needs an "Au" for per-day electricity subscriptions, so it uses the suggested reading date (the 15th, or the Sunday before), without storing it.
- b. **An explicit flag**, `common.estimated: true`, written with the estimate and removed when you confirm the actual reading.

In both options, an index you have not re-typed keeps its estimated value. So the confirmation of the actual reading lists the indexes still equal to their estimate.

➡️ Recommendation: a. `readingDate` already means "the reading is taken" (`docs/period-file.md`), so no new key is needed, and a flag could drift from the indexes.

### Answer to Q32b

A

## Q32c - Who writes the estimate

- a. **A button** on the twelfth month, "Estimer les relevés", enabled once the eleventh month has its reading date. It writes the estimated indexes as ordinary patches.
- b. **Automatically**, when the eleventh month's reading date is typed.

➡️ Recommendation: a. A write you didn't ask for, on a month you haven't opened, is surprising, and an estimate should be a deliberate act. The button can be offered right after the eleventh reading date is typed.

### Answer to Q32c

A

## Q12b - What "Nouvelle période" prefills

The new period can be created any time after the estimate (Q3b). Should "Nouvelle période" prefill `monthlyTenantBillAdvance` with the previous period's next advance **as shown at that moment**, estimated or actual, still editable? You'd create the new period when you communicate the advance in mid-August, so the two match.

➡️ Recommendation: yes. Storing "the communicated advance" separately just to cover a late creation adds a key for a case the routine avoids. The field stays editable if you create it late and the figure has moved.

### Answer to Q12b

No, the difference in one month consumption should not impact much the "Nouvelle période" prefill `monthlyTenantBillAdvance`.

We'll look into a mechanism if it becomes an issue in the future.

## Q35 - When closing happens

Q3b means the next period no longer waits for the close. So the close can wait for the water bills:

- a. **Close at the actual August reading** (mid-September), as your remark says. The October water bills then correct the closed period, so the history of communicated settlements and the settlement corrections carried into the running period stay (Q14 to Q22, Q26 to Q29, limited to the ten water keys of Q13b).
- b. **Close once the water bills are in** (October): the period stays open, and "provisoire", until then, and you close it after typing the water prices. Nothing is editable after closing (Q13b's list becomes empty). The history, the corrections and the cross-file write all go. Closing writes a single marker again (Q4's `settings.closedOn`, re-asked next round).

➡️ Recommendation: b. It removes the mechanism you called unnecessary complexity, along with the exceptions to ADR 0001 and ADR 0004. The cost is a settlement that stays provisional for about a month after the August reading, which changes nothing for the tenant: the advance was already communicated in mid-August (Q34). A bill that turns up after closing would be a rare case, handled outside the app.

### Answer to Q35

B.

Let's plan a message on the provisional settlement to remind the landlord to communicate to the tenant that the settlement will come in October.
