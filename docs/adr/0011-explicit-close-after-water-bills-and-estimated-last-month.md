# A period is closed explicitly once its water bills are in, and its last month is estimated to give the next advance early

Replaces ADR 0006. Do not read ADR 0006.

A period is closed by an explicit "Clôturer la période" action, not derived from the data: it writes the top-level `closedOn` date, and a closed period is fully read-only and cannot be reopened. The landlord closes it once the water consumption and water treatment bills are in, around October, a month after the last reading. To give the tenant the next monthly tenant bill advance before September, the app writes the twelfth month's indexes as estimates when that month is initialized: each meter's eleventh-month index plus its delta in the previous period's twelfth month (or the eleventh month's delta when there is none), with an HC/HP total split 30 % / 70 %. Those months carry the stored `common.estimated` flag, which blocks closing until the real reading is confirmed. "Nouvelle période" is allowed as soon as the previous period's twelfth month is estimated or read, and prefills its advance from that settlement.

## Considered options

- **Closed when all twelve readings are entered**: rejected, because the water bills and the last tenant bill advance arrive after the last reading, so a "final" settlement would still move.
- **Close at the last reading, then correct**: a history of communicated settlements, with each later water price correction carried into the running period's settlement. Rejected as unnecessary complexity: it wrote two period files per correction and stored computed balances. It was only needed because the next advance was known at closing; the estimate removes that pressure, so closing can wait for the bills.

## Consequences

- An estimated month is the one exception to "a stored value means typed", and the `common.estimated` flag tells it apart (ADR 0008).
- From mid-August to October, two periods are open at once: the old one waiting for its water bills, and the new one.
- The next period's advance is the estimated one communicated in mid-August; it does not follow the actual reading.
