# Impact 5 - period table, "Saisie du mois" form, dialogs

## Impact

- The table shows only the months present in the file, your note on the summary. Otherwise the table does not change (your answer). `prototypes/period-table/src/prototype/model.ts` still builds twelve months.
  - That's OK.
- No inherited styling and no "falls back to the inherited value" on emptying a cell: every value is stored. Emptying a cell removes the stored value and the figure shows "—", except `tenantBillAdvance`, which becomes 0.
  - The empty cells with be highlighted on an incomplete month, so that's OK.
- New: the Yes/No apply dialog after the edit of an inheritable value or of a current index (Case 8, `docs/scenarios.md`), and the "initialize the next month" CTA (Cases 2 and 3).
- Gone: "Compteur remplacé" and the tariff-switch rules for previous indexes. A previous index is a stored value, editable like any other.

## Judgment calls to review

- The apply dialog has no equality guard (Q22, Q23): it overwrites every later month, including one where you typed a different value on purpose.
  - This is fine because it acts as a backfill from the month a value changed (ex: tariff per kWh for electricity or pric per m3 for water consumption)
- The "Estimer les relevés" button is gone: the estimate is written when the twelfth month is initialized (Case 6, confirmed by you).
  - Approved

## Path to done

1. Rewrite the issues listed in impact 7.
2. Keep the shared line definitions of the table and the form.
3. Build the apply dialog once and use it from both screens.

> Approved

## Needed from you

Nothing: approved.
