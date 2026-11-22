# Summary - feedback on the code review of issue #60

## Shared understanding

Issue #60 adds `periodTotals` (`src/domain/periodTotals.ts`), exposed as `totals` of `computePeriodFigures`: the tenant total of each section, the balance, the settlement amount and direction, the exact average and the next advance rounded up to the euro. The review found no defect and two judgment calls.

The balance is rounded to cents before the settlement direction is chosen, so float noise such as 1e-14 never names a debtor for a 0.00 settlement. One uncomputable month still blanks the section total and everything derived from it (balance, settlement, next advance): that can only happen on the provisional view during data entry, because the next-period workflow and the closing both require computable months (`docs/scenarios.md` Cases 4, 6 and 7, `docs/period-file.md`).

## Decision index

- Q1 (v01): round the balance with `roundCents` before the direction test and in `balance` and `settlementAmount`.
- Q2 / Q2b (v01, v02): keep the whole total `undefined` when one month is uncomputable.
- Q3 (v02): the scenario only occurs on the provisional view during entry; nothing changes.

## Rejected alternatives

- Q1: keep the raw balance (the sheet formula), or round only for the direction test.
- Q2b: list the uncomputable months next to the totals, or return a partial sum with an "incomplete" flag.
- Q3: reopen the issue so the totals keep a value mid-entry.

## Decided without being asked

- The settlement direction for a rounded balance of exactly 0 stays `tenantToLandlord`, as in the sheet formula ("otherwise").
  - The label is "Les comptes sont bons. Personne ne doit rien.". The code is `balanceisEven`.
