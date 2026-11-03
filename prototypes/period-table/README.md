# PROTOTYPE — period table (issue #9)

Throwaway. Deleted in the last commit before `docs/9-period-table-library` is merged (Q12 of `docs/grillings/2026-11-03-period-table-library/`).

Three versions of the period table on one page, switchable with `?variant=` or the floating bar at the bottom:

- `?variant=shadcn`: plain shadcn-vue `Table`, row model built by hand.
- `?variant=tanstack`: shadcn-vue data-table pattern with `@tanstack/vue-table` v9 (sections from its grouping).
- `?variant=native`: native `<table>` styled with Tailwind, row model built by hand, no shadcn-vue and no TanStack.

## Run

```sh
cd prototypes/period-table
pnpm install
pnpm dev
```

Then open the URL Vite prints, with `?variant=shadcn`, `?variant=tanstack` or `?variant=native`. State is in memory: a reload starts again from `docs/examples/2026-2027.json` with a few months typed in (October and November readings, a warning on October's studio Base index, January switched to HC/HP).

The floating bar only takes clicks: the arrow keys belong to the table.

## What is shared and what differs

Shared by the three versions, so only the table rendering differs:

- `src/prototype/model.ts`: fixture, line definitions, inheritance, editability, formatting, parsing, and the patch log that stands in for the queue. Computed values are placeholders.
- `src/prototype/useGrid.ts` + `usePeriodGrid.ts`: the keyboard model (Q4, Q6 to Q10b).
- `src/prototype/PeriodCell.vue`: one month cell, with the same styling everywhere.

Differs: `src/variants/VariantShadcn.vue` (51 lines), `VariantTanstack.vue` (94 lines), `VariantNative.vue` (49 lines).

## Comparison per requirement

- Sections as row groups. By hand: one `flatMap` over the sections, a `v-if` for header rows. TanStack: two features and two row models (`columnGroupingFeature`, `rowExpandingFeature`, grouped and expanded row models), a `section` column that exists only to group by, `initialState: { grouping, expanded: true }`, a `row.getIsGrouped()` branch, and filtering that `section` column out of the header and of every row. Harder with TanStack.
- 12 month columns, edited and saved on blur. Same cell component and keyboard grid in all three. TanStack renders the cell through a column definition with `h(PeriodCell, ...)` instead of the template. No simpler.
- Read-only computed rows, inherited styling, warnings, inactive tariff cells. All live in `cellView()` and `PeriodCell`, the same in all three. No difference.
- Keyboard model. None of the three provides any of it. TanStack's row order is the lines' order, so the grid row index is carried in the row data. No simpler.
- Reactivity. Edits (a new index, January switched back to Base) update every version, TanStack v9 included, with no extra code.
- shadcn-vue wrappers vs native `<table>`. `Table`'s root is its scroll container `div`. Attributes (`role`, `tabindex`, `@keydown`, `style`) fall through to it, but its `class` prop goes to the inner `<table>`. So the container's max height went through `style`, and the grid root is reached as `el.$el`. Minor friction, nothing made harder. The native version needed the classes copied by hand and is 2 lines shorter.

Applying the rules settled in Q15 and Q15b: TanStack is simpler on no requirement and harder on one (grouping), so the row model built by hand wins. The shadcn-vue wrappers made no requirement harder, so they stay. Your verdict after trying the three versions decides.
