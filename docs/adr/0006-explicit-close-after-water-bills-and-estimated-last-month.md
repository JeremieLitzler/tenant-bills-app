# A period is closed explicitly once its water bills are in, and its last month is estimated to give the next advance early

A period is closed by an explicit "Clôturer la période" action, not derived from the data: it writes `settings.closedOn`, and a closed period is fully read-only and cannot be reopened. The landlord closes it once the water consumption and water treatment bills are in, around October, a month after the last reading. To give the tenant the next monthly tenant bill advance before September, an "Estimer les relevés" button writes the twelfth month's indexes as estimates once the eleventh month is read: each meter's July index plus its delta in the previous period's August (or this July's delta when there is none), with an HC/HP total split 30 % / 70 %. A twelfth month holding indexes but no `readingDate` is estimated; typing the reading date makes it read. "Nouvelle période" is allowed as soon as the previous period's last month is estimated or read, and prefills its advance from that settlement.

## Considered options

- **Closed when all twelve reading dates are entered**: rejected, because the water bills and the last tenant bill advance arrive after the August reading, so a "final" settlement would still move.
- **Close at the August reading, then correct**: a history of communicated settlements, with each later water price correction carried into the running period's settlement. Rejected as unnecessary complexity: it wrote two period files per correction and stored computed balances. It was only needed because the next advance was known at closing; the estimate removes that pressure, so closing can wait for the bills.

## Consequences

- A stored index without a reading date is an estimate, an exception to ADR 0001's "a stored value means typed".
- From mid-August to October, two periods are open at once: the old one waiting for its water bills, and the new one.
- The next period's advance is the estimated one communicated in mid-August; it does not follow the actual August reading.
