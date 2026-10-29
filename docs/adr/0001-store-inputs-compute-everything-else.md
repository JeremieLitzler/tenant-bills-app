# Store inputs only, compute every derived line

The period JSON files store only what the landlord types (indexes, prices, occupant counts, charge advances, bills, reading dates). Every line the spreadsheet computes by formula (deltas, landlord and tenant shares, section totals, the settlement) is computed by the app at display time and never written to the file. Stored computed values would go stale whenever an input is corrected, and keeping the formulas in code makes them testable.

A value that is not edited for a month is not stored either: it is inherited from the previous month at display time, the way the spreadsheet's `=C18` formulas do, so correcting an earlier month also corrects the months that never overrode it.

One exception (ADR 0006): the twelfth month's indexes can be stored as estimates, written by "Estimer les relevés" before the reading is taken. They are told apart from typed indexes by the absence of `common.readingDate` in that month.
