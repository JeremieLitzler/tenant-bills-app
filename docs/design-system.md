# Design system

Visual choices to reuse, so they are not decided again. Add a line when a choice is made.

- A disabled button is greyed out: `Button` applies `opacity-50` and `cursor-not-allowed` to `:disabled`. Never style a disabled state per call site.
- A message telling the user why something is refused or unavailable is a warning: `text-theme-warning text-sm` with the `IconTriangleAlert` icon (`size-4`), as in `PeriodListItem.vue` and `NewPeriod.vue`.
- A page's content on desktop sits in a centred container: `mx-auto w-full max-w-3xl` (the home page). Wide pages, such as the period table, do not.
- A button and the warning explaining why it is disabled are stacked and centred: `flex flex-col items-center`, with `text-center` on the message (`NewPeriod.vue`).
