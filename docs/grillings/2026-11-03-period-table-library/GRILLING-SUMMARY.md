# Grilling summary — period table library (issue #9)

Session started 2026-11-03, rounds v01 to v03, on the branch `docs/9-period-table-library`. No ADR and no new glossary term: the outcome goes into a new "Period table" section of `docs/architecture.md`, once the prototype has picked the approach.

## Shared understanding

Issue #9 asked to confirm the shadcn-vue data-table pattern (TanStack Table) for the period table (F5). The session did not confirm it outright. The period table is transposed compared with TanStack's row model: one row per line of a section and one column per month, as in the spreadsheet (Q1). Its shape is fixed (about 60 lines, 12 months), so sorting, filtering, pagination and selection, TanStack's main features, go unused. And the hard requirements are per cell (editability, inherited styling, warnings), which a custom cell component handles in any approach. I recommended a plain shadcn-vue `Table` with a hand-built row model. You chose to decide after a throwaway prototype instead (Q3).

**The prototype.** It lives in `prototypes/period-table/` on this branch, as its own small Vite app, and is deleted in the last commit before the pull request is merged, so the history keeps it (Q12). It uses the planned stack: Vue 3, Vite, TypeScript, Tailwind, shadcn-vue added with its CLI (Q13). It has three versions, each built on the same line definitions:

1. A plain shadcn-vue `Table` with a hand-built row model.
2. The shadcn-vue data-table pattern with `@tanstack/vue-table`.
3. A native `<table>` styled with Tailwind directly, with the hand-built row model, no shadcn-vue and no TanStack (Q13b). It tests whether shadcn-vue's thin `Table` wrappers earn their place for this table.

Each version covers the same slice (Q14): `common`, `waterConsumption` and `electricity`, read from `docs/examples/2026-2027.json` with one month switched to `hchp`. That includes one placeholder computed line per section, inherited styling, one warning, previous indexes editable only in the first month, the inactive tariff cells, save on blur logged as the patch `{ period, month, field, value }`, and the keyboard model below. There is no queue, no GitHub and no real formula. The scope can grow after a first look.

**How the winner is chosen.** Two comparisons, each putting the burden of proof on what is added (Q15, Q15b). TanStack against the hand-built row model: the plain version wins unless TanStack is clearly simpler on at least one requirement and harder on none, and a tie goes to the plain version, with one dependency fewer. The shadcn-vue wrappers against a native `<table>`: the wrappers stay unless they make a requirement harder, because shadcn-vue is already in the stack and the other pages will use it. The comparison reports, per requirement, the code each version needed.

**Electricity rows.** The tariff mode is per month, so one period can mix `base` and `hchp`, as 2025-2026 did in August. Rows are shared by all months, so every electricity row is always shown (Q2). In a month in `base`, the HC and HP cells are not editable and are empty, styled as not applicable, and the reverse in `hchp` (Q11). The period file keeps the other mode's keys, but no formula of that month reads them, so showing them would suggest they count.

**The keyboard model** was not in the starting proposal. I proposed Enter-down on top of native Tab. You answered with a spreadsheet-like model with a selection mode and an edit mode (Q4), and v02 completed it:

- Selection mode: the arrows move one cell up, down, left (previous month) or right (next month), stopping at the edges (Q4, Q6). They visit every cell, editable or not, but skip section header rows, since arrows are also how you read computed lines and closed periods (Q10).
- From selection mode, Enter edits the selected cell; it does nothing on a read-only cell (Q4, Q10). Typing a character on an editable cell starts editing and replaces the value with it (Q9).
- Edit mode: Enter saves and moves to the next editable cell down in the same month, staying in edit mode; on the month's last editable cell it saves and returns to selection mode (Q10b). Escape restores the earlier value, enqueues nothing, and returns to selection mode (Q8). Arrow Left / Right move the text cursor (Q6).
- The table is a single Tab stop, following the ARIA grid pattern: Tab leaves it (Q7). That keeps the period actions, "Rafraîchir" and the sync badge one key away.

Neither TanStack nor shadcn-vue provides this model: focus, selection and edit mode are our code in every version. The prototype shows whether one version makes it simpler.

## Decision index

- Q1 (v01): rows are lines of a section, columns are the 12 months, plus a label column.
- Q2 (v01): every electricity row is always shown; cells of the month's inactive tariff mode are not editable.
- Q3 (v01): the table approach is decided after a throwaway prototype, not up front.
- Q4 (v01): spreadsheet-like selection and edit modes; Enter edits, Enter in edit mode moves down, Arrow Up / Down move, stopping at the edges.
- Q5 (v01): the decision is recorded in a "Period table" section of `docs/architecture.md`, no ADR.
- Q6 (v02): Arrow Left / Right move between months in selection mode and move the text cursor in edit mode.
- Q7 (v02): the table is one Tab stop (ARIA grid); Tab leaves it.
- Q8 (v02): Escape in edit mode restores the earlier value and enqueues nothing.
- Q9 (v02): typing a character in selection mode starts editing and replaces the value.
- Q10 (v02): arrows visit every cell except section header rows; Enter does nothing on a read-only cell.
- Q10b (v02): Enter in edit mode saves and goes to the next editable cell down, staying in edit mode; on the last one it returns to selection mode.
- Q11 (v02): inactive tariff cells are empty, styled as not applicable.
- Q12 (v02): the prototype lives in `prototypes/period-table/` on this branch and is deleted before the merge.
- Q13 (v02): the prototype uses the planned stack with the real shadcn-vue components, plus a version without shadcn-vue.
- Q13b (v03): that version is a native `<table>` styled with Tailwind, with the hand-built row model: three versions in all.
- Q14 (v02): the slice is `common`, `waterConsumption` and `electricity` with every F5 requirement once and placeholder computed values; it can grow after a first look.
- Q15 (v02): TanStack must be clearly simpler on one requirement and harder on none; a tie goes to the hand-built row model.
- Q15b (v03): the shadcn-vue wrappers stay unless they make a requirement harder.

Superseded: none. Q4's answer replaced my own proposal (native Tab plus Enter-down), and Q13's answer added the third version.

## Decided without grilling (object if any is wrong)

- Mouse behaviour was not grilled. The prototype will use: a click selects a cell, a double click on an editable cell starts editing, and a click outside an editing cell saves it (blur, as decided in F5).
  - Approved
- The keyboard model applies to the period table only. The "Saisie du mois" form keeps native form behaviour (Tab between fields).
  - Correct
- What "inherited styling", "not applicable" and "warning" look like (colours, italics, icon) is left to the prototype, with the same styling in all three versions so it does not tilt the comparison.
  - Correct
- The prototype is not deployed to Netlify; you run it locally with `pnpm dev` from `prototypes/period-table/`.
  - Approved
- The "Period table" section of `docs/architecture.md` will hold the chosen approach, the comparison per requirement, and the keyboard model, since the keyboard model must survive the prototype's deletion.
  - Approved
- No `GLOSSARY.md` entry: "selection mode", "edit mode" and "not applicable" are UI terms, not domain language.
  - Approved

## After the prototype

Recorded in the "Period table" section of `docs/architecture.md`.

- Verdict: no major difference between the three versions, so by Q15 and Q15b the period table uses the plain shadcn-vue `Table` with rows built by our own code; no TanStack.
- Q12 changed: `prototypes/period-table/` is kept in the repo, so the phone layout can be tested on a real phone later.
- Phones: Q20 of the functional breakdown stands; the "Saisie du mois" form is the phone screen for entering a month, since selection and edit modes are clumsy by touch. A CSS-only layout makes the table readable on a phone: narrower label column, one month per screen width, horizontal scroll snapping one month at a time. Labels stacked above inputs would need different HTML, which is the form.
- Found while testing: the selected cell could hide under the sticky header (fixed with scroll padding), and section titles scrolled away sideways (made sticky).

## Paste-ready for issue #9

> Grilled in `docs/grillings/2026-11-03-period-table-library/`, prototyped in `prototypes/period-table/`, recorded in the "Period table" section of `docs/architecture.md` (no ADR). **Verdict: plain shadcn-vue `Table` with rows built by hand, no TanStack Table.** The three versions showed no major difference; TanStack was harder for sections and simpler for nothing.
>
> - **Why not confirm TanStack outright**: the table is transposed from TanStack's row model (rows are lines of a section, columns are the 12 months, as in the spreadsheet), its shape is fixed so sorting, filtering and pagination go unused, and the hard requirements are per cell in any approach.
> - **Prototype**: `prototypes/period-table/`, kept in the repo for a test on a phone. Three versions on the same line definitions: plain shadcn-vue `Table` with a hand-built row model, shadcn-vue data-table with `@tanstack/vue-table`, and a native `<table>` with Tailwind only. Slice: `common`, `waterConsumption`, `electricity` from the example period file, one month in `hchp`, every F5 requirement once, placeholder computed values.
> - **Choice rule**: TanStack is kept only if it is clearly simpler on one requirement and harder on none; a tie goes to the hand-built row model. The shadcn-vue wrappers stay unless they make a requirement harder.
> - **Electricity**: every row is always shown; cells of the month's inactive tariff mode are empty and not editable.
> - **Phones**: the "Saisie du mois" form stays the phone entry screen; a CSS-only layout makes the table readable on a phone, one month per swipe.
> - **Keyboard**: spreadsheet-like selection and edit modes. Arrows move between cells (headers skipped), Enter or typing starts editing, Enter in edit mode saves and moves to the next editable cell down, Escape cancels, and the table is one Tab stop (ARIA grid).
