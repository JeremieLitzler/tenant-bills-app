# Grilling summary — Collapsible sections on the period page (#124)

## Shared understanding

Issue #124 asked for one tab per section on the period page, with a warning icon on an incomplete tab and a green check on a complete one, assuming an "all inputs are provided" check already existed. It did not: `docs/period-file.md` defined a complete month only in words, and nobody had written down the list of required inputs. #124 now defines that list (Q13) and implements the check once as a Vue-free domain function in `src/domain/`, which closing (#84) will reuse (Q1). The glossary gains **Complete month** and **Complete section** (Q14).

The first big change from the issue is about who edits. A table section covers every month of the period, so its icon would have had to judge several months at once. To avoid that, the period table becomes read-only and the "Saisie du mois" form becomes the only place to edit (Q2). The table carries no icon (Q2b); the icons live on the form, where each judges one month (Q8). Making the table read-only is a separate issue that lands first; #124 builds on top of it (Q9). That issue keeps the selection mode (arrows, the warning bubble of #67 under the selected cell) and drops only the edit mode (Q10). Enter or a double click on a cell opens the form of that month, with the cell's section open and the cell's field focused (Q11).

The second big change is that there are no tabs at all. Rounds v01 and v02 settled on tabs, then a prototype (`prototypes/section-tabs/`) compared three layouts per page, and collapsible sections won on both pages at every width (Q15). The table shows every section as a group of rows that opens and closes from its header row; the form shows one panel per section, with its icon in its heading. Several sections can be open at once. On arrival with nothing in the URL, every section is closed and only the common lines show (Q16). The open sections live in the URL query, `?open=electricity,internet`, on both pages, so a reload or coming back from a month keeps them (Q6b). The form uses native `<details>`/`<summary>`; the table uses a button with `aria-expanded` in each section header row (Q5b). In the table, the arrows visit the section header rows too, Enter or Space opens or closes the section, the rows of closed sections are skipped (Q17), and closing the section holding the selected cell moves the selection to that header row (Q18).

The icons also changed meaning from the issue. A complete form section shows a green check, an incomplete one shows no icon, and a section holding a warning (an index below its previous index) shows the warning icon, which replaces the green check when both apply (Q4, Q4b). A closed or read-only period shows no icons.

"Commun" is not a collapsible section: the common lines are always shown, first in the table and above the panels in the form, and get no icon; their fields keep their own highlight and bubble (Q3, Q3b, Q3c, Q4c).

## Decision index

- Q1 (v01): #124 defines the required inputs and implements "a month is complete" as a Vue-free domain function, reused by closing (#84).
- Q2 (v01): the period table becomes read-only; only the "Saisie du mois" form edits.
- Q2b (v02): the table carries no icon.
- Q3 (v01): the common lines are not a section that opens or closes; they are always shown.
- Q3b (v02): in the form, the common fields sit above the section panels.
- Q3c (v02): in the table, the common rows come first, in the same table as the sections.
- Q4 (v01): complete section > green check; incomplete section > no icon; section with a warning > warning icon.
- Q4b (v02): the warning icon replaces the green check when a section is complete and has a warning.
- Q4c (v02): the common lines get no icon; their fields keep their own highlight and bubble.
- Q5b (v03): native `<details>`/`<summary>` in the form; a button with `aria-expanded` in each section header row of the table.
- Q6b (v03): both pages keep the open sections in the URL query, `?open=…`.
- Q8 (v01, via Q2): the form gets the same treatment as the table, each icon judging that one month.
- Q9 (v02): a separate issue makes the table read-only first; #124 builds on top.
- Q10 (v02): the read-only table keeps the selection mode and the #67 bubble, drops the edit mode.
- Q11 (v02, v03): Enter or a double click on a table cell opens the form of that month, with the cell's section open and its field focused.
- Q13 (v02): the required-input list below.
- Q14 (v02): glossary gains **Complete month** and **Complete section**.
- Q15 (prototype): collapsible sections on both pages at every width, several open at once; no tabs.
- Q16 (v03): with no `?open=`, every section is closed on both pages.
- Q17 (v03): in the table, the arrows visit the section header rows; Enter or Space opens or closes; closed sections' rows are skipped.
- Q18 (v03): closing the section holding the selected cell moves the selection to its header row.

Q13's list, a section being complete when every key it requires is present (`0` counts as present):

- `common`: `startDate`, `endDate`, `landlordOccupants`, `tenantOccupants`, `tenantBillAdvance`. Not `estimated`.
- `waterConsumption`: the three current indexes, their three previous indexes, `pricePerM3`, `resourceWithdrawalFee`, `drinkingWaterFee`, `networkPerformanceFee`, `subscription`, `vat`.
- `waterTreatment`: `monthlySubscriptionDistributor`, `monthlySubscriptionCommunity`, `collectionConsumptionDistributor`, `collectionConsumptionCommunity`, `sanitationPerformance`, `vat`.
- `waterSoftener`: complete when empty or when `quantity` is `0`; a non-zero `quantity` requires `unitPrice` and `description`.
- `electricity`: `tariffMode`, `subscriptionUnit`, `excisePerKwh`, `subscriptionPerUnit`, `ctaTax`, `vat`, plus the month's tariff mode only: in `base`, `mainBase`, `studioBase`, their previous indexes and `kwhPriceBase`; in `hchp`, `mainHc`, `mainHp`, `studioHc`, `studioHp`, their previous indexes, `kwhPriceHc` and `kwhPriceHp`.
- `internet`: `billedAmount`.
- `heatPumpMaintenance`: `billedAmount`.

## Rejected alternatives

- Q1: a separate issue defining the check first, or a layout without icons. Lost because the icons are the point of #124.
- Q2: an editable table whose section icons judge every month, or only the latest month, or the selected cell's month. Lost because a read-only table avoids judging several months at once ("to avoid the core of Q2").
- Q2b: table icons judging every month, or a green check per month column header. Lost with Q2.
- Q3: "Commun" as a section like the others. Lost to keeping the common lines always in view.
- Q3c: the common rows as a separate table, its scroll kept in step with the section table.
- Q4: the issue's rule (incomplete = warning icon) and "completeness only" icons. Lost to: no icon when incomplete, the warning icon for actual warnings.
- Q4b: showing both icons on a complete section with a warning.
- Q4c: a status icon next to the common lines.
- Q5 (v01), Q6, Q7, Q12: shadcn-vue `Tabs`, the selected tab in `?section=`, a scrollable tab strip on phones. Settled in v01 and v02, then dropped with the tabs (Q15).
- Q5b: the shadcn-vue `Accordion` in the form.
- Q6b: open sections stored only by the form, or not stored at all.
- Q8: a step-by-step wizard, or keeping the form as one page.
- Q9: making the table read-only inside #124.
- Q10: dropping the selection for a plain table with hover tooltips.
- Q11: only the month column header opening the form.
- Q14: adding only **Complete month**.
- Q15: horizontal tabs (prototype variant A) and a vertical section list (variant B) on either page, and mixing layouts per screen width (table A on desktop, form B on desktop, C on mobile). Lost to one layout per page with nothing chosen by screen width.
- Q16: every section open on arrival, or the form opening its incomplete sections.
- Q17: the header-row buttons as ordinary Tab stops outside the grid.
- Q18: moving the selection to the next visible row.

## Never grilled, decided to write this summary

- With an unknown section name in `?open=`, the page ignores it.
  - Approved
- The icons come from `@lucide/vue` (a check circle and a warning triangle).
  - Approved.
- A closed or read-only period shows no icons. Decided by your note on the earlier summary.
  - Approved
- The required-input list is written into `docs/period-file.md` ("Keys per section"), next to the keys it names.
  - Approved.
- The read-only table reverses the editing part of the 2026-11-03 table grilling (issue #9). It gets no ADR (it is cheap to reverse, like the original choice); `docs/architecture.md` ("Period table", "Keyboard and mouse") is rewritten by the read-only issue.
  - Approved.
- Issue #124's title, "Tabbed UI for a period page", no longer matches; it should be renamed, for example to "Collapsible sections on the period page and the month form".
  - Approve rename
