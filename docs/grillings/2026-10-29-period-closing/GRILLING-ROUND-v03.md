# Grilling round v03 — when a period is closed (issue #7)

## Settled in v02

- Q4: the marker is `settings.closedOn: "YYYY-MM-DD"`, the date "Clôturer la période" was pressed, absent while the period is open. Closing is an ordinary settings patch. `schemaVersion` stays `1`.
- Q5: a closed period can **not** be reopened. Instead, some pricing keys of water consumption, water treatment and electricity stay editable on a closed period (the exact list is Q13). Your example: a water bill received now shows that `waterConsumption.pricePerM3` and `waterConsumption.subscription` changed in March. You wrote March 2025; I read it as March 2026, inside 2025-2026. Correct me if that's wrong.
- Q6: "Clôturer la période" is enabled only when every month has a `readingDate` and every tenant share is computable. Months with a `0` tenant bill advance are listed in the confirmation, without blocking.
- Q8: a patch queued before the close reached the file applies as usual, and the app flags it afterwards.
- Q9: the settlement view shows both the exact average (69.69) and the rounded advance (70).
- Q11: you accept the gap: nothing is recorded for the new period until the old one is closed.
- Q12: v1's "Nouvelle période" prefills `monthlyTenantBillAdvance` from the closed previous period's settlement, still editable. Everything else stays typed by hand.

## Reopened

- **Q2** (closed means locked): Q5 makes the lock partial, since some pricing keys stay editable. The lock itself stands. What's left open is the list of exceptions (Q13). Reopening (Q5 a) is gone, so "change anything after reopening" no longer applies.
- **Q7** (does the lock cover `settings`): you answered "see Q5", but Q5 lists only section pricing keys, so the `settings` question is still open. Re-asked as Q7b.
- **Q3 / Q9b** (rounding): Q3 says "rounded to the euro **up**", but the formula you put in Excel, `=ROUND(-SUM(N5:N10)/12;)`, rounds to the **nearest** euro. They give 70 for 69.69, but 69.40 gives 70 with the first and 69 with the second. Re-asked as Q9c.
- **Q10** (the first period has no previous one): your answer asks for an import of 2025-2026 instead, which reopens functional breakdown Q22 ("no spreadsheet import"). The import is Q16 and Q17. The original question is re-asked as Q10b.

Facts I looked up:

- `scripts/extract-golden.py` (test-scope grilling, `docs/architecture-tests.md`) already reads the sheet `Période-092025-092026` and writes a period file in the shape of `docs/period-file.md`. Today it only runs on the randomized copy, because the repo is public and the real readings are private.
- The 2025-2026 settlement you communicated, `Régularisation-20252026!N13` ("TOTAL DU"), is `256.31`. It includes the manual "Réajustement" line `N11 = -20`, which ADR 0002 removed. A twelve-month 2025-2026 file computed by the app will not give 256.31.

## Q7b - What the lock covers

Q2 locks every cell. Does the lock also cover the period's `settings` (today only `monthlyTenantBillAdvance`)?

- a. **Yes**: everything in the file is read-only except the pricing keys of Q13.
- b. **No**: settings stay editable on a closed period.

➡️ Recommendation: a. `monthlyTenantBillAdvance` doesn't change the settlement, and Q12 copies it into the next period at creation, so editing it afterwards has no use. One rule with one listed exception is easier to trust.

### Answer to Q7b

A, because `monthlyTenantBillAdvance` doesn't make sense to change.

Open to edits on a property basis when we add new settings in the future.

## Q9c - Rounding of the next monthly tenant bill advance

- a. **Nearest euro**: `ROUND(total tenant shares / 12, 0)`, as in the Excel formula you just updated. 69.40 gives 69.
- b. **Up to the euro**: `CEIL(total tenant shares / 12)`, as you wrote in Q3. 69.40 gives 70. Excel would then need `=ROUNDUP(-SUM(N5:N10)/12;0)`.

➡️ Recommendation: b if "up" was intended. Rounding up means the advances cover the expected charges, so the next settlement more often ends with the landlord refunding a small amount than with the tenant owing. If "up" was loose wording, a keeps Excel as it is. This is your call; the code follows either one, and the golden record must match.

### Answer to Q9c

B. Excel updated

## Q10b - The first period has no previous one

Should "Nouvelle période" check the previous period only when that period exists in the data repo, and allow it freely otherwise?

➡️ Recommendation: yes. With the 2025-2026 import (Q16), 2026-2027 has a previous period and the check applies to it. The rule is still needed for a data repo without any history, for example a fresh test repo.

### Answer to Q10b

Yes

## Q13 - Keys still editable on a closed period

Q5 keeps "the pricing of water consumption, treatment and electricity tariff" editable. In the period file, those are:

- `waterConsumption`: `pricePerM3`, `resourceWithdrawalFee`, `drinkingWaterFee`, `networkPerformanceFee`, `subscription`, `vat`.
- `waterTreatment`: `collectionConsumptionDistributor`, `collectionConsumptionCommunity`, `sanitationPerformance`, `vat`.
- `electricity`: `excisePerKwh`, `kwhPriceBase`, `kwhPriceHc`, `kwhPriceHp`, `subscriptionPerUnit`, `ctaTax`, `vat`.

Not in the list, so locked: indexes and previous indexes, reading dates, occupant counts, tenant bill advances, the electricity `tariffMode` and `subscriptionUnit`, the water softener purchases, `internet.billedAmount` and `heatPumpMaintenance.billedAmount`.

Is the editable set exactly these seventeen keys?

➡️ Recommendation: yes. These are the values a late bill corrects. `tariffMode` and `subscriptionUnit` change which keys apply and how many units are billed; that is a structure, not a price. `internet.billedAmount` is a known bill from the start, so it doesn't need to change later.

### Answer to Q13

All good but the electricity `tariffMode` and `subscriptionUnit` stay editable also.

## Q14 - Knowing what was communicated

With Q13, editing a price on a closed period changes its tenant shares, its balance and its "Nouvelle annualisation". Today, the app only stores inputs (ADR 0001), so after such an edit nothing remembers the balance you handed to the tenant.

- a. **Store nothing more**: the closed period's settlement view shows the recomputed figures. A banner says that prices can be corrected after closing. The figure communicated at closing lives only in git history.
- b. **Store the communicated balance**: closing also writes `settings.closedBalance`, the balance at that moment (positive: the landlord owes the tenant). The view then shows "Solde à la clôture", "Solde actuel" and the difference.

➡️ Recommendation: b. The balance you communicated is a fact that happened, not a figure derived from the file, so recording it doesn't break the spirit of ADR 0001. Without it, a late price correction leaves you with no way to see how much to ask for or refund. ADR 0001 then gets one line naming this exception.

### Answer to Q14

B. I'd phrase it "version the communicated balance" to keep an history. We'll need to record the details to explain it though.

## Q15 - The next period after a late price correction

A price edited on a closed 2025-2026 changes its "Nouvelle annualisation". The next period's `monthlyTenantBillAdvance` was copied from it at creation (Q12). Should the next period keep its stored value, without following the change?

➡️ Recommendation: yes. It is a stored input of the next period, already used for the tenant's transfers. If you want a new value, you edit it on the next period, which is open.

### Answer to Q15

Yes, but I'd say that we need to keep track of the difference between each communicated balance and add this to the running period. The value is integrated to the settlement of the running period in a `common.previousPeriodSettlementsDelta`.

## Q16 - Importing 2025-2026

Functional breakdown Q22 said "no spreadsheet import". You now need `periods/2025-2026.json` to upload to the data repo. Proposal:

- a one-off script, not an app feature: `extract-golden.py` gets a mode that reads the real workbook without randomizing it. It writes the file **outside** this public repo (a path you pass), so the real readings never get committed here;
- you upload the file to `JeremieLitzler/tenant-bills-data` yourself;
- the details (arguments, where the twelve months come from given the sheet's thirteenth column) go into a follow-up issue, outside this session.

Is that the shape of the import?

➡️ Recommendation: yes. The conversion already exists for the fixture, so this is a flag, not a new tool. A follow-up issue keeps this session on closing.

### Answer to Q16

yes, but write the file to this repo's root and gitignore it.

## Q17 - The imported 2025-2026 is closed

The 2025-2026 settlement was already communicated. Should the import write `settings.closedOn`, with the date you settled 2025-2026 passed to the script, so that 2025-2026 is closed from the moment it is uploaded and 2026-2027 can be created right away?

➡️ Recommendation: yes. Otherwise you would close it in the app at once, under a date that isn't the real one. If Q14 is b, `closedBalance` comes into play too. Since the sheet's 256.31 includes the removed "Réajustement", the script should write the 256.31 you actually communicated, not the app's recomputed balance. That's for the follow-up issue to confirm.

### Answer to Q17

yes. It was settled on 2026-09-12.
