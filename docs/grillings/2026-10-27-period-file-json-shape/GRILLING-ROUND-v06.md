# Grilling round v06 — period file JSON shape (issue #5)

## Settled in v05

- Q28: the file accepts `...Previous` meter keys in any month, and Q25 does not flag them. The UI makes a previous-index line editable only in the first month, in a tariff switch month for that mode's registers, and where the meter already has a `...Previous` key or "Compteur remplacé" was used. `readingDatePrevious` stays first-month-only in the file. This replaces the validation part of Q5.

Two things came up while preparing the example file (issue #5 asks for one built from September and October 2026-2027). Both are decisions that were never grilled.

## Q29 - What typing the inherited value stores

In October, the sheet retypes `resourceWithdrawalFee` as 0.07, the same value September has. Under ADR 0001, October would inherit 0.07 anyway.

a. Typing a value equal to the inherited one stores nothing (no patch is queued, or the key is removed if one existed). The cell stays marked "inherited".
b. Typing always stores the key, even when equal; the cell is then marked as overridden, and a later change in September no longer reaches October for that line.

➡️ Recommendation: b. Typing a value is a statement that you read it on that month's bill: if September is corrected later, October keeps what its own bill said. a would silently turn a confirmed value back into an inherited one. Under b, the example stores October's three retyped water fees (0.07, 0.39, 0.02).

### Answer to Q29

B

## Q30 - How the example handles the sheet's zero placeholders

September's sheet holds 0 for every HC/HP index (rows 50-53, 56-59) and for the softener quantity, with a softener unit price of 9.5. These zeros fill empty cells; they were not read off a meter or a bill.

a. The example leaves them out: no HC/HP keys (the month is in `"base"` mode, Q22), and no `softener` object (a quantity of 0 is no purchase, and the unit price is not inherited, Q7b).
b. The example copies them as explicit zeros, as the sheet has them.

➡️ Recommendation: a. Q4 makes an explicit 0 mean "typed 0", which these are not. Leaving them out also shows the two rules (inactive tariff mode, no purchase) in the example.

### Answer to Q30

A
