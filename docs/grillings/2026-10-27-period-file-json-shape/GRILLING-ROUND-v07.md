# Grilling round v07 — period file JSON shape (issue #5)

## Settled in v06

- Q29: typing a value always stores the key, even when it equals the inherited value; the cell is then overridden, and a later correction of an earlier month no longer reaches it.
- Q30: the example leaves out the sheet's zero placeholders: no HC/HP keys in `"base"` mode, and no `softener` object for a month with quantity 0.

## Reopened

- Q29's recommendation said the example stores October's "three retyped water fees". Reading column C again, that was wrong: October holds typed constants (not `=B..` formulas) in many more rows. Q31 decides what the example takes from them. The Q29 rule for the app is unchanged.

## Q31 - Which of October's sheet constants the example stores

Column C holds typed constants in rows 19-23 (water fees, subscription, VAT), 38-43 (treatment), 66-69 and 73-75 (electricity prices, taxes, VAT). Only three differ from September: `drinkingWaterFee` 0.43 > 0.39 (row 20), `networkPerformanceFee` 0.1 > 0.02 (row 21), `cta` 3.43 > 3.32 (row 74). The others repeat September's value, and October's reading date (15/11/2026) is still ahead, so the month is partly prefilled.

a. Store only the three values that differ, plus `chargeAdvanceReceived`, `readingDate` and `internet.billedAmount`. The repeated constants are treated like Q30's zeros: column fill, not values read on October's bills.
b. Store every constant of column C, as Q29 would if you had typed each of them in the app.

➡️ Recommendation: a. The repeated values look like a dragged column, the same way the HC/HP zeros were, and storing them would freeze October against a later correction of September (Q29) for no reason. If some of them were really read on October's bills, b is right; you know which.

### Answer to Q31
