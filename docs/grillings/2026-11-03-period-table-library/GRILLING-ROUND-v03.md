# Grilling round v03 — period table library (issue #9)

## Settled in v02

- Q6: in selection mode, Arrow Left / Arrow Right move to the same line in the previous / next month, stopping at September / August. In edit mode they move the text cursor.
- Q7: the table is one Tab stop (ARIA grid pattern); Tab leaves it, arrows move inside it.
- Q8: in edit mode, Escape restores the value from before editing, enqueues nothing, and returns to selection mode on the same cell.
- Q9: typing a character in selection mode on an editable cell starts edit mode and replaces the value with that character.
- Q10: the arrows visit every cell, editable or not, but not the section header rows. Enter in selection mode does nothing on a read-only cell.
- Q10b: in edit mode, Enter saves and moves to the next editable cell down in the same month, staying in edit mode. On the month's last editable cell, it saves and returns to selection mode on the same cell.
- Q11: inactive tariff cells are empty, styled as not applicable.
- Q12: the prototype lives in `prototypes/period-table/` on this branch, as its own small Vite app, deleted in the last commit before the pull request is merged.
- Q13: the prototype uses the planned stack (Vue 3, Vite, TypeScript, Tailwind, shadcn-vue added with its CLI, `@tanstack/vue-table`), and you also want a version without shadcn-vue. (What that version is: Q13b.)
- Q14: both versions cover the slice in a (`common`, `waterConsumption`, `electricity` from `docs/examples/2026-2027.json` with one month in `hchp`, one placeholder computed line per section, inherited styling, one warning, first-month previous indexes, inactive tariff cells, save on blur logged as a patch, the keyboard model). The scope can grow after a first look.
- Q15: the plain shadcn-vue table wins unless the TanStack version is clearly simpler on at least one requirement and harder on none; on a tie, the plain table wins. (How this extends to a third version: Q15b.)

Fact for Q13b: shadcn-vue's `Table` is a set of about eight thin wrapper components (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, ...), each a native table element with Tailwind classes and the `cn` helper. They hold no logic. Without them, the table is the same markup with the classes written inline.

## Q13b - What the version without shadcn-vue is

Your Q13 answer adds a version without shadcn-vue. Which one?

a. A third version: a native `<table>` styled with Tailwind directly, with the same hand-built row model as the plain shadcn-vue version, no shadcn-vue and no TanStack. It tests whether the shadcn-vue `Table` wrappers earn their place for this table.
b. A third version: TanStack Table without shadcn-vue, rendering a native `<table>` styled with Tailwind. It tests TanStack on its own, separately from the wrappers.
c. Two extra versions, a and b, for four in total (the 2x2 of shadcn-vue or not, TanStack or not).
d. You mean shadcn-vue as a whole for the app, not only for this table. Then this is a wider question than issue #9 and becomes its own issue; the prototype keeps two versions.

➡️ Recommendation: a. The question you raise is whether shadcn-vue helps this table, and a answers it with one version more and no new dependency. b adds little: TanStack's fit does not depend on which markup it renders, so the second version already measures it. If you meant d, say so and I will draft the issue instead.

### Answer to Q13b

A

## Q15b - Choosing among three versions

If a third version is added (Q13b), how does Q15's rule extend?

a. Two comparisons, each with the burden of proof on what is added. First, TanStack against the hand-built row model, as in Q15. Second, the shadcn-vue `Table` wrappers against a native `<table>`: the wrappers stay unless they make a requirement harder, since shadcn-vue is already in the stack (`src/components/ui/`) and the other pages will use it.
b. The same rule for both comparisons: a native `<table>` wins unless shadcn-vue is clearly simpler on at least one requirement and harder on none.
c. Your call after trying all of them, with no rule set in advance.

➡️ Recommendation: a. Unlike TanStack, shadcn-vue is not a new dependency for the app, and keeping one table style across the pages has value of its own. So for the wrappers the question is whether they get in the way (for example of the focus and selection styling), not whether they save code.

### Answer to Q15b

A
