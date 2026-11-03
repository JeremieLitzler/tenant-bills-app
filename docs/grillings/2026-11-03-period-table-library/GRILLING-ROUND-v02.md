# Grilling round v02 — period table library (issue #9)

## Settled in v01

- Q1: the table keeps the spreadsheet's orientation: one row per line of a section, one column per month (September to August), plus a label column.
- Q2: every electricity row is always shown. In a month in `base`, the HC and HP cells are not editable; in a month in `hchp`, the Base cells are not editable. (What those cells display is Q11.)
- Q3: the approach is decided after a throwaway prototype of both: a plain shadcn-vue `Table` with a hand-built row model, and the shadcn-vue data-table pattern with TanStack Table. (How the prototype is run is Q12 to Q15.)
- Q4: the table has a selection mode and an edit mode, as in a spreadsheet. In selection mode, Enter starts editing the selected cell, and Arrow Up / Arrow Down move to the cell above / below, stopping at the first / last cell. In edit mode, Enter moves to the next cell down. (The keys and cases you did not mention are Q6 to Q10b.)
- Q5: the decision is recorded in a new "Period table" section of `docs/architecture.md`, no ADR.

Note: neither approach provides this keyboard model. TanStack Table renders rows and cells; focus, selection and edit mode are code we write in both prototypes. The prototype will tell whether one of them makes that code simpler.

## Q6 - Arrow Left and Arrow Right

In selection mode, should Arrow Left / Arrow Right move to the same line in the previous / next month, stopping at September / August? In edit mode, they move the text cursor inside the input.

➡️ Recommendation: yes. It completes the spreadsheet model you described, and comparing a line across months (an index going up, a price that changed) is one of the reasons to use the table rather than the form.

### Answer to Q6

yes

## Q7 - Tab

What should Tab do inside the table?

a. Tab leaves the table and goes to the next control on the page (the ARIA "grid" pattern: the table is one Tab stop, arrows move inside it).
b. Tab moves to the next month on the same line, Shift+Tab to the previous one, as in a spreadsheet; it leaves the table only after the last cell.
c. Tab moves to the next editable cell down, like Enter in edit mode.

➡️ Recommendation: a. With arrows covering movement inside the table, a single Tab stop keeps the rest of the page (period actions, "Rafraîchir", the sync badge) one key away instead of about 700 cells away. It is also the behaviour screen readers expect from a grid.

### Answer to Q7

A

## Q8 - Escape in edit mode

In edit mode, should Escape cancel the edit: restore the value the cell had before editing, enqueue nothing, and go back to selection mode on the same cell?

➡️ Recommendation: yes. It is the spreadsheet behaviour and the only way to back out of a mistyped value without creating a patch. Leaving the cell any other way (Enter, a click elsewhere, blur) saves, as decided in F5.

### Answer to Q8

Approved

## Q9 - Typing a character in selection mode

In selection mode, when you type a digit or a letter on an editable cell, what happens?

a. Edit mode starts and the typed character replaces the cell's value, as in a spreadsheet.
b. Nothing; only Enter (or a double click) starts editing.

➡️ Recommendation: a. Entering a new month's readings becomes "select, type, Enter, type, Enter" with no extra key per cell. The previous value is not lost by accident, since Escape restores it (Q8).

### Answer to Q9

A

## Q10 - Which cells the arrows visit

The table holds editable cells, read-only cells (computed lines, previous indexes outside their editable months, inactive tariff cells from Q2, every cell of a closed period) and section header rows. Which ones do the arrows stop on?

a. Every cell, editable or not, but not the section header rows. Enter in selection mode does nothing on a read-only cell.
b. Editable cells only.

➡️ Recommendation: a. Arrows are also how you read the table, so a computed share or a closed period's values must be reachable. Header rows hold no value, so stopping on them would only add a key press per section.

### Answer to Q10

A

## Q10b - Where Enter in edit mode goes

In edit mode, Enter saves and moves down. Which cell does it select?

a. The next editable cell down in the same month, skipping read-only cells and section headers, and it stays in edit mode there. On the month's last editable cell, it saves and goes back to selection mode on the same cell.
b. The cell just below, whatever it is, in selection mode.

➡️ Recommendation: a. It turns the monthly routine into typing values and Enter, top to bottom, without stepping over computed lines by hand. Staying in edit mode only makes sense when the next cell is editable, which a guarantees.

### Answer to Q10b

A

## Q11 - What inactive tariff cells display

From Q2, in a month in `base` the HC and HP cells are not editable, and the reverse. The period file keeps the other mode's keys and ignores them, and those keys are inherited, so such a cell may have a stored or inherited value. What does it show?

a. Nothing: the cell is empty, styled as not applicable.
b. The stored or inherited value, greyed out.

➡️ Recommendation: a. The value is ignored by every formula of that month, so showing it would suggest it counts. Empty cells also make the month's mode readable at a glance.

### Answer to Q11

A

## Q12 - Where the prototype lives

Where should the throwaway prototype be built?

a. In `prototypes/period-table/` on this branch, as its own small Vite app, deleted in the last commit before the pull request is merged, so the history keeps it.
b. Outside the repo, in a temporary folder, never committed.
c. In `prototypes/period-table/`, kept in `main` after the merge.

➡️ Recommendation: a. You can run and try both versions yourself before deciding, the findings stay traceable in the branch history, and `main` does not carry a second app next to the real scaffold (F10 and onward).

### Answer to Q12

A

## Q13 - Stack of the prototype

Should the prototype use the app's planned stack: Vue 3, Vite, TypeScript, Tailwind, the real shadcn-vue components added with its CLI, and `@tanstack/vue-table` for the second version?

➡️ Recommendation: yes. The question is how shadcn-vue's `Table` behaves with and without TanStack, so the real components must be there; a mock-up in another stack would not answer it.

### Answer to Q13

Yes, but also a prototype without shadcn-vue

## Q14 - Scope of the prototype

What should both versions cover?

a. A slice: `common` (reading date, occupants, tenant bill advance), `waterConsumption` and `electricity`, read from `docs/examples/2026-2027.json` with one month switched to `hchp`. Plus: one computed line per section (the tenant share), inherited styling, one warning, previous indexes editable only in the first month, inactive tariff cells (Q2, Q11), save on blur logged as the patch `{ period, month, field, value }`, and the keyboard model (Q4, Q6 to Q10b). No queue, no GitHub, no real formulas: computed values can be placeholders.
b. Every section and every line, with the real formulas.
c. Only the keyboard model and editable cells, no sections.

➡️ Recommendation: a. It touches every requirement of issue #9 at least once, including the per-cell rules where the two approaches could differ, while staying small enough to build twice. The real formulas belong to `src/domain/` and do not change which table approach fits.

### Answer to Q14

Let's start with A

## Q15 - How the winner is chosen

After trying both versions, what decides?

a. The plain table wins unless the TanStack version is clearly simpler (less code, or a requirement that is easier) on at least one requirement, with no requirement harder. On a tie, the plain table wins: one dependency fewer.
b. TanStack wins unless it fails a requirement, because it is the documented shadcn-vue pattern.
c. Your call after trying both, with no rule set in advance.

➡️ Recommendation: a. It puts the burden of proof on the extra dependency and gives the comparison something to measure, so the "Period table" section can state why. I will report, per requirement, the code each version needed.

### Answer to Q15

A
