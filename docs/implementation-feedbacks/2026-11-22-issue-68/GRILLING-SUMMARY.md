# Implementation feedback summary - issue #68 (period totals column)

## Shared understanding

Issue #68 added a read-only "Total" column to the period table. The review of commit `c9c512d` raised 10 judgment calls, now settled. The column shows the advances total and each section's tenant share total (water consumption, water treatment, water softener, electricity, internet, heat pump) and stays empty on the other lines. An uncomputable tenant share shows "—" instead of a partial sum. The set of lines with a total is confirmed as right. The heat pump total sits on its only line, `heatPumpMaintenance.billedAmount`. A month without an advance counts as 0 in the advances total, because the advances are typed inputs and `periodTotals` (#60) already works this way.

The one change from the starting design is the position. The issue said the column comes after August, as the spreadsheet's column N. The landlord now wants it as the first data column, right after the label column, so the year is visible without scrolling. Nothing is sticky: the Total keeps only the sticky header row it has today, and it scrolls like a month column on a phone. A prototype of sticky variants was built to decide this and discarded, never committed.

The Total cells stay out of the keyboard selection: the arrows move over the month columns only, and the first month stays the selection's first column. The cells keep `role="gridcell"`.

Code changes to make: a `withTotal(line, fn)` helper in `periodLines.ts` for the six mappings; the total's text moves to `periodLines.ts` as `formatTotal(line, totals)` with a unit test; the section header span gets a named Vue `computed`; the dash test becomes table-driven over the six totals; one `Figures` type alias in the spec. Docs to update: `docs/architecture.md` (the table shape sentence at line 230, the arrows rule at lines 247-248) to describe the Total column after the label column and out of the selection.

## Later change (after the summary was approved)

Each section's tenant share total moved from its `tenantShare` line to the section header row, in the Total column, so a closed section (on a phone) still shows it. The `tenantShare` lines keep their monthly values, and the advance line keeps the advances total. This supersedes Q3 (heat pump total on `billedAmount`): the heat pump total is on its header row too. On a phone the Total column is a full panel like a month.

## Decision index

- Q1 (v01, v03): update `docs/architecture.md` to describe the read-only Total column; the sticky part was dropped in v02.
- Q2 (v01): the 7 lines with a total are right.
- Q3 (v01): the heat pump total stays on `heatPumpMaintenance.billedAmount`.
- Q4 (v01): a month without an advance counts as 0 in the advances total.
- Q5 (v01): the total cells stay out of the selection, keep `role="gridcell"`, and architecture.md says the arrows skip them.
- Q6 (v01): the dash test is table-driven over the six totals.
- Q7 (v01): add the `withTotal(line, fn)` helper.
- Q8 (v01): move the total's text to `periodLines.ts` as `formatTotal(line, totals)`, unit-tested there.
- Q9 (v01): keep the `+ 2` arithmetic, held in a named Vue `computed`.
- Q10 (v01): one `Figures` type alias in the spec.
- Q11 (v02): no stickiness on the Total column.
- Q12 (v02): moot, nothing sticky.
- Q13 (v03): the Total column comes right after the label column, before September.

## Rejected alternatives

- Q1: leave the doc as is.
- Q2: other totals or fewer totals than the 7 lines (not weighed, the set matched).
- Q3: a new computed `heatPumpMaintenance.tenantShare` line; no heat pump total.
- Q4: "—" in the advances total when a month has no advance.
- Q5: make the Total selectable; drop `role="gridcell"`.
- Q6: one test for the shared code path.
- Q7: keep the object spread; an optional `total` argument on `computed` and `input`.
- Q8: keep `totalText` in `PeriodTable.vue`.
- Q9: derive the span with a new layout rule.
- Q10: leave the three casts.
- Q11: sticky on the right edge (A); sticky on the left beside the label (B). The landlord chose "forget about the stickiness".
- Q13: before the label column (b); after August as in the issue (c).

## Decided without being asked

- Issue #68's text ("after August, as the spreadsheet's column N") is now out of date. I will draft a comment on #68 and on its parent #32 in a file for you to read, and post nothing without your go-ahead.
  - The PR's content will already state. Is the comment really adding value?
- Keyboard: with the Total as the first data column, the selection's column indexes still count months only (month 0 is the first month), so the Enter key and the arrows behave as today.
  - Approved
- The heat pump line shows the total on an input line, as decided in Q3.
  - Approved, with a note: the docs will benefit this, because it was decided in a implementation feedback already and this round didn't find it. So /writing-for-agents is needed to avoid this again as long as it is succinct
