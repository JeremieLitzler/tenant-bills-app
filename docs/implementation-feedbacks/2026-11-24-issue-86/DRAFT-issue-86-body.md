## Parent

#35 (spec F8 Settlement view)

## What to build

The settlement tells the landlord how far to trust the figure (ADR 0006): provisional, estimated while the twelfth month is estimated, read once the twelfth month's reading date is typed while the period is open, final once closed.

- A domain function `settlementState(file)` returns `provisional`, `estimated`, `read` or `final`. It is separate from `periodStatus` (draft, ongoing, ending, closed): the two machines answer different questions and share only `closedOn`.
- Estimated twelfth month: the title says "Régularisation estimée" and the page shows the estimated balance and next advance.
- Twelfth month read and period open: the twelfth month banner reminds the landlord that the final settlement comes about a month after the last reading, with the water bills.
- Closed period: the title says "définitive, clôturée le <date>" with `closedOn`, and there is no banner.

## Acceptance criteria

- [ ] `settlementState` returns `provisional`, `estimated`, `read` and `final` (specs)
- [ ] An estimated twelfth month shows "Régularisation estimée" with the next advance (spec)
- [ ] A read twelfth month on an open period shows the twelfth month banner (spec)
- [ ] A closed period shows final with its closing date and no banner (spec)
