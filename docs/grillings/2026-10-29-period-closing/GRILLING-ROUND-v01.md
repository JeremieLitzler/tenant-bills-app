# Grilling round v01 — when a period is closed (issue #7)

## Settled before this session

From the earlier grilling summaries, `docs/period-file.md`, `docs/architecture.md` and the ADRs:

- Functional breakdown Q25: the settlement view is available for any period, computed from the months entered so far, labelled "provisoire" until the period is closed. "Closed" was never defined; this session defines it.
- Functional breakdown Q13: the settlement view is computed and read-only. It shows, per section, the tenant share per month and in total, the tenant bill advances received, the balance with who owes whom, and the next monthly tenant bill advance ("Nouvelle annualisation" = total tenant shares / 12).
- ADR 0001: the period file stores inputs only. ADR 0005: one file per period, `schemaVersion` 1, twelve fixed months, `settings` for values set once per period.
- `common.readingDate` (N) is stored only once the reading is taken. The August month's `readingDate` is the end of the period's last consumption window.
- `common.tenantBillAdvance` is present in every month from creation, `0` meaning "nothing received". So "all twelve advances received" cannot be told apart from "the tenant paid nothing this month" by looking at the file.
- v1 "Nouvelle période" is filled by hand; the prefill from the previous period (including the next monthly tenant bill advance) is v2.
- The routing has `/periods/[period]/settlement` for the settlement view.

Facts I looked up:

- No code exists yet (`src/` is not scaffolded), so nothing contradicts any answer below.
- The glossary has no term for a closed or final period.

## Q1 - What makes a period closed

Three candidate rules:

- a. **Derived from the reading dates**: the period is closed as soon as all twelve months have a `readingDate`. No change to the file shape.
- b. **Derived from completeness**: closed when every month has a `readingDate` _and_ every value its formulas need (indexes, prices, VAT…), so every tenant share is computable. No change to the file shape.
- c. **Explicit action**: a "Clôturer la période" button stores a closing marker in the file. The settlement stays "provisoire" until you press it, even when every month is complete.

What a derived rule cannot see: the August reading is typed mid-September, but the August tenant bill advance, a late internet bill, or a corrected electricity price can arrive after it. With a or b, the label flips to final while you may still be waiting on those, and the tenant could be shown a "final" balance that later moves. With c, "final" means "I, the landlord, have checked it and communicated it", which is what the settlement is for.

➡️ Recommendation: c. The settlement is a statement you hand to the tenant; only you know when every bill is in. It costs one field in the file (shape decided next round).

### Answer to Q1

C

## Q2 - Editing a closed period

Once a period is closed, a cell edit in that period is:

- a. **Allowed, with a warning**: the cell saves as usual, and the app shows a banner on the period ("Cette période est clôturée : la régularisation communiquée peut changer").
- b. **Locked**: every cell of the period is read-only; changing anything requires reopening the period first (whether reopening exists is decided next round if you pick Q1 c).

This applies whichever rule Q1 picks.

➡️ Recommendation: b. A closed settlement is a figure already communicated to the tenant; a silent change behind it is the one thing to prevent. Locking makes the change a deliberate step instead of a stray tap on the phone form. Q27 ("implausible values are flagged, never blocked") is about input values, not about a closed period, so it does not argue against locking. Locking only stays workable if a closed period can be reopened, which is next round's question.

### Answer to Q2

B

## Q3 - Closing and the next period

Should creating the next period ("Nouvelle période") require the previous one to be closed?

- a. **No**: you can create 2027-2028 while 2026-2027 is still "provisoire". The September 2027 reading usually comes before the settlement is done.
- b. **Yes**: "Nouvelle période" is refused until the previous period is closed.

➡️ Recommendation: a. The new period's first month starts on the August reading date, which you need to type before the settlement is final, and blocking it would stop the monthly routine. The v2 prefill can still read the next monthly tenant bill advance from the previous period, provisional or not, with a warning.

### Answer to Q3

B.

Once I close the current period, all the values for the new period are known, in particular the new monthly tenantBillAdvance which I need to be the monthly average of the previous year's settlement.

For example:

- current tenantBillAdvance was 50 in period 2025-2026.
- at the end of the current period, the settlement shows that the new tenantBillAdvance which is rounded to the euro up (`69.69 > 70.00`). See settlement example in excel file.
