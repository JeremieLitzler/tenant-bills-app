# Design system

Visual choices to reuse, so they are not decided again. Add a line when a choice is made.

- A disabled button is greyed out: `Button` applies `opacity-50` and `cursor-not-allowed` to `:disabled`. Never style a disabled state per call site.
- A message telling the user why something is refused or unavailable is a warning: `text-theme-warning text-sm` with the `IconTriangleAlert` icon (`size-4`), as in `PeriodListItem.vue` and `NewPeriod.vue`.
- A page's content on desktop sits in a centred container: `mx-auto w-full max-w-3xl` (the home page). Wide pages, such as the period table, do not.
- A button and the warning explaining why it is disabled are stacked and centred: `flex flex-col items-center`, with `text-center` on the message (`NewPeriod.vue`).
- A text input is `rounded border px-2 py-1` (`MonthForm.vue`, `NewPeriod.vue`).
- A disabled text input is greyed out with `disabled:opacity-50` (`PeriodSettings.vue`), the same look as a disabled button.
- An invalid value typed in an input is told right under it by the same warning (`text-theme-warning flex items-center gap-1 text-sm` with `IconTriangleAlert`, `size-4`), and nothing is saved (`PeriodSettings.vue`).
