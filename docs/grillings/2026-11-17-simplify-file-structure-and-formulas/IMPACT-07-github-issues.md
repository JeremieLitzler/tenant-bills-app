# Impact 7 - open GitHub issues

Proposal only. I changed no issue. Each edit, comment or closing needs your go-ahead. "Rewrite" means the body cites the old shape; the "why" column names it.

## Close (proposed)

| Issue                                              | Why                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| #78 Estimer les relevés in the Saisie du mois form | The button is gone: the estimate is written when the twelfth month is initialized (Case 6). |

## Rewrite

| Issue                                                 | Why                                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| #30 to #35 (specs F3 to F8)                           | Mention `settings`, inheritance, 13 months, reading date, schemaVersion 1. Rewrite after the sub-issues.                                  |
| #48 One edit reaches the data repo                    | Patches `settings.<key>` become top-level patches; add the whole-month patch (ADR 0010).                                                  |
| #52 Two devices: rebase on 409                        | `settings.closedOn` becomes `closedOn`.                                                                                                   |
| #53 Multi-group drains                                | The `settings` group name; month initialization subject (impact 4).                                                                       |
| #54 Period creation write                             | `createPeriod(id, settings)` becomes `createPeriod(id, values)` with the first month only; no heat pump split.                            |
| #57 Water figures                                     | Collection subscription in the water treatment, ratios.                                                                                   |
| #59 Softener, internet, heat pump                     | The split is no longer a domain function applied at creation: it is applied at each month initialization, remainder in the twelfth month. |
| #61 Estimate of the twelfth month                     | `readingDate`: the estimate is flagged by `common.estimated`, written at initialization.                                                  |
| #62 Period state, close, Nouvelle période             | New computed status and completeness (impact 6).                                                                                          |
| #63 Reading date suggestion                           | Becomes the `endDate` prefill; the warning compares `endDate` with `startDate`.                                                           |
| #64 Period table, water sections                      | Months present in the file, not twelve September-to-August columns; inherited styling removed.                                            |
| #66 Softener, internet, heat pump lines               | "Shows as inherited" removed.                                                                                                             |
| #67 Warnings in the table                             | Reading-date warning wording.                                                                                                             |
| #71 Editing cells through the queue                   | "Unchanged text keeps the value inherited" and "emptying falls back to inherited" no longer hold; add the apply dialog.                   |
| #72 Previous index rules, Compteur remplacé, lock     | Drop the previous index rules and Compteur remplacé; keep the closed-period lock. Consider renaming.                                      |
| #73 Month controls                                    | Tariff and unit are copied at initialization; reading date picker becomes `endDate`; the advance suggestion reads the top-level value.    |
| #74 Estimer les relevés and last reading confirmation | Keep only the confirmation of the real reading (removes `common.estimated`); the button goes.                                             |
| #76, #77 Saisie du mois                               | Inherited display and previous index rules removed.                                                                                       |
| #80 Period list                                       | `settings.closedOn` becomes `closedOn`.                                                                                                   |
| #81 Nouvelle période                                  | Any start month, name from start year, `startDate` and `tenantName` asked.                                                                |
| #82 Heat pump split in the form                       | Form asks `heatPumpInvoiceEstimate` only; the split happens at month initialization.                                                      |
| #83 Period settings editing                           | No `settings`: it edits the top-level `monthlyTenantBillAdvance`. Rename it.                                                              |
| #84 Clôturer la période                               | `closedOn` top-level; `schemaVersion` 2; none of the months estimated.                                                                    |
| #86 Estimated and final settlement                    | Status names (impact 6); `closedOn`.                                                                                                      |
| #20 Grill estimating the readings of any month        | Wording only: `readingDate` becomes `endDate`.                                                                                            |

## Unaffected

#14, #15, #19, #24, #36, #49 to #51, #58 (only wording on tariff keys), #60, #65, #68 to #70, #75, #79, #85, #87 to #91, #104, #106.

## New issues to create (proposed)

1. Convert 2025-2026 to `schemaVersion` 2 (impact 3).
2. Initialize the next month: copy, both indexes, one patch (Cases 2, 3).
3. The apply dialog (Case 8).
4. Decide the month-initialization commit message (impact 4).
5. Regenerate the golden record and the workbook (impact 2).

## Blockers

- Domain types and validation (impact 1) block #48 and #57 to #62.
- The conversion script and the golden record block every spec that reads real data.
- #31 says "blocked by #18" (closed: the import of 2025-2026). That import produced the v1 file, so the conversion in impact 3 replaces it as the real blocker.

## Path to done

1. You approve the list above, per row or as a whole.
2. I edit the bodies with `gh issue edit`, comment on the issues I close, and create the new ones.
3. I update #106 with the checklist ticked.

## Needed from you

This file is not reviewed yet. Please reply per row or for the whole table: approve, change, or drop. Until then I edit and close nothing. Two answers matter most: close #78 yes or no, and the five new issues yes or no.
