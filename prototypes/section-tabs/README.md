# PROTOTYPE — section tabs (issue #124)

Throwaway, not part of the app. It answers "what should the read-only period table and the "Saisie du mois" form look like with their sections split up?", per `docs/grillings/2026-11-20-section-tabs/GRILLING-SUMMARY.md`.

Three variants per page, switchable with `?page=` and `?variant=` or the floating bar at the bottom (the left and right arrow keys also cycle):

- `?page=table&variant=A`: the settled design. A horizontal tab strip, no icons, one table starting with the common rows.
- `?page=table&variant=B`: a vertical section list on the left (a select on phones), the table on the right.
- `?page=table&variant=C`: no tabs. Every section collapses from its header row, and several can be open at once.
- `?page=form&variant=A`: the settled design. Common fields above a horizontal tab strip with icons.
- `?page=form&variant=B`: a side column with the common fields and a vertical section checklist with icons.
- `?page=form&variant=C`: no tabs. Collapsible panels with their icon in the summary.

`?section=` and `?month=` hold the selected section and the form's month. A click on a month header in the table opens the form on that month.

## Run

From the repo root:

```sh
pnpm prototype:section-tabs
```

It uses the app's own dependencies and imports its real modules (`periodLines`, `computePeriodFigures`, `monthWarnings`, the shadcn-vue table), so nothing needs installing.

State is in memory. A reload starts again from `docs/examples/2026-2027.json` plus three made-up months, which cover every icon:

- 2026-09: every section complete.
- 2026-10: electricity incomplete (no current indexes in the example).
- 2026-11: an electricity warning (studio Base index below its previous one).
- 2026-12: water consumption and internet incomplete.
- 2027-01: switched to HC/HP, with no HC/HP indexes or prices.

The form edits the in-memory period, so filling a field updates the icons. The "État" panel at the bottom lists every month's section statuses.
