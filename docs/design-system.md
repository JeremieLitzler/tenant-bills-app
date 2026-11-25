# Design system

Visual choices to reuse, so they are not decided again. Add a line when a choice is made.

- A disabled button is greyed out: `Button` applies `opacity-50` and `cursor-not-allowed` to `:disabled`. Never style a disabled state per call site.
- A message telling the user why something is refused or unavailable is a warning: `text-theme-warning text-sm` with the `IconTriangleAlert` icon (`size-4`), as in `PeriodListItem.vue` and `NewPeriod.vue`.
- A page's content on desktop sits in a centred container: `mx-auto w-full max-w-3xl` (the home page). Wide pages, such as the period table, do not.
- A button and the warning explaining why it is disabled are stacked and centred: `flex flex-col items-center`, with `text-center` on the message (`NewPeriod.vue`).
- A text input is `rounded border px-2 py-1` (`MonthForm.vue`, `NewPeriod.vue`).
- A disabled text input is greyed out with `disabled:opacity-50` (`PeriodSettings.vue`), the same look as a disabled button.
- An invalid value typed in an input is told right under it by the same warning (`text-theme-warning flex items-center gap-1 text-sm` with `IconTriangleAlert`, `size-4`), and nothing is saved (`PeriodSettings.vue`).
- The period page header is a grid on desktop (`md:grid-cols-[auto_1fr] md:gap-x-12`: column 1 as wide as its content, column 2 right beside it), one column on mobile with column 1 above column 2; the wide period table sits in its own row below (`pages/periods/[period]/index.vue`).
- The closing button and the checklist explaining its state are stacked and left-aligned in the second column (`flex flex-col items-start`), unlike the centred button and warning of `NewPeriod.vue`: the checklist is a list, not a one-line warning (`pages/periods/[period]/index.vue`).
- A checklist line is an `IconCircleCheck` (`text-theme-success`) or `IconCircleX` (`text-theme-error`) at `size-4 mt-1`, aligned with the first line of its label (`items-start`), so details listed under the label do not push the icon down (`CloseChecklist.vue`).
- A page-level information banner (the read-only notice, the twelfth month banner) is a box: `border-theme-warning bg-theme-warning/10 text-foreground flex items-start gap-3 rounded-lg border p-3`, with `IconTriangleAlert` at `size-5 mt-0.5 shrink-0` (`SettlementView.vue`).
