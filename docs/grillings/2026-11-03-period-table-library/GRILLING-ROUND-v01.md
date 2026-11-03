# Grilling round v01 — period table library (issue #9)

Starting point: issue #9 asks to confirm that the shadcn-vue data-table pattern (TanStack Table, `@tanstack/vue-table`) fits the period table (F5), or to record an alternative such as a plain shadcn-vue table. No app code exists yet (no `package.json`, no `src/`), so any prototype starts from nothing. This session runs on the branch `docs/9-period-table-library`.

Facts gathered for this round:

- The period table is transposed compared with what TanStack Table is built for. TanStack expects one data object per row and one accessor per column. Here, each row is a line of a section (for example `waterConsumption.mainMeter`, or a computed tenant share) and each of the 12 columns is a month, as in the spreadsheet.
- The table has a fixed shape: about 60 lines, 12 month columns, no sorting, no filtering, no pagination, no row selection. Those are the features TanStack mainly brings. Its remaining help would be grouping (`getGroupedRowModel`), column definitions and `flexRender` for custom cells.
- shadcn-vue's plain `Table` components (`Table`, `TableRow`, `TableCell`, ...) are styled `<table>` elements with no logic. The data-table pattern is those same components driven by TanStack.
- Most F5 requirements are per cell, not per row or per column: whether a cell is editable (previous indexes only in the first month, a tariff-switch month or after "Compteur remplacé"), whether its value is inherited, whether it carries a warning. Neither approach gives these for free; both need a custom cell component reading `usePeriod(id)`.

## Q1 - Orientation of the table

Should the period table keep the spreadsheet's orientation: one row per line of a section, one column per month (September to August), plus a first column with the line labels?

a. Rows = lines, columns = months, as in the spreadsheet.
b. Rows = months, columns = lines (the shape TanStack expects, but about 60 columns wide).

➡️ Recommendation: a. It is the layout the landlord already reads, the monthly routine fills one month top to bottom, and 12 columns fit a laptop screen where 60 do not. It is also why TanStack fits poorly: its row model would have to be built from lines, not from months.

### Answer to Q1

A

## Q2 - Electricity rows when months use different tariff modes

The tariff mode is per month and inherited (`base` or `hchp`), so one period can mix both: 2025-2026 switched supplier in August. Rows are shared by all 12 months, so "show only the relevant rows" cannot be decided per month. Which rule should hold?

a. A Base row is shown when at least one month of the period is in `base`; an HC or HP row when at least one month is in `hchp`. In a month of the other mode, those cells are empty and not editable.
b. Always show every electricity row; cells of the other mode are empty and not editable.
c. Show the rows of the selected month's mode only, and change them when another month is selected.

➡️ Recommendation: a. It keeps a period with a single mode free of empty rows, which is the common case, and a mixed period shows both sets with the irrelevant cells visibly blank. c ties the table to a "selected month" that the table does not otherwise have.

### Answer to Q2

B.

If mode is `base`, the cells for `hchp` mode are left non editable. The reverse is true.

## Q3 - Table approach

Given the facts above, which approach should the period table use?

a. A plain shadcn-vue `Table`, with a row model built by hand: a list of line definitions (section, key, label, input or computed, inherited or not) iterated with `v-for`, sections as header rows, and one cell component handling edit-on-blur, inherited styling, warnings and editability.
b. The shadcn-vue data-table pattern with TanStack Table: rows built from the same line definitions, sections through `getGroupedRowModel`, months as column definitions, cells rendered with `flexRender`.
c. Decide after a throwaway prototype of both.

➡️ Recommendation: a. The features TanStack brings (sorting, filtering, pagination, selection) are not used, the table is transposed from its row model, and every hard requirement lives in the cell component either way. A hand-built row model is a plain list in `src/domain/` or next to the table, easy to test and with one dependency fewer. b would only pay off if sorting or filtering lines were ever wanted.

### Answer to Q3

C

## Q4 - Keyboard movement between cells

The monthly routine fills one month's column top to bottom. In a native `<table>`, Tab moves across the row, so from one month to the next for the same line. Should the table add sheet-like movement?

a. Keep native Tab (across months), and add Enter to move to the editable cell below in the same month.
b. Make Tab move down the month's column instead of across.
c. Native Tab only; no added movement in v1.

➡️ Recommendation: a. Enter-down matches filling a month top to bottom, as in a spreadsheet, without breaking Tab's expected behaviour for accessibility. The "Saisie du mois" form already covers entering one month field by field.

### Answer to Q4

Enter key (non edit mode): focus a cell to input value.
Enter key (in edit mode): move to next cell down
Arrow Up (non edit mode): move to the cell up, unless it is the first cell
Arrow Down (non edit mode): move to the cell down, unless it is the last cell

## Q5 - Where the decision is recorded

Where should the table approach be recorded?

a. A new "Period table" section in `docs/architecture.md`, no ADR.
b. An ADR in `docs/adr/`.

➡️ Recommendation: a. Swapping the table's rendering later touches one component and its row model, not the period file or the queue, so the choice is cheap to reverse and does not meet the ADR bar. This follows how issues #4 and #8 were recorded.

### Answer to Q5

A
