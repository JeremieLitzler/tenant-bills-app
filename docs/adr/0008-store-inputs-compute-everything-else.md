# Store inputs only, compute every derived line

Replaces ADR 0001. Do not read ADR 0001.

The period JSON files store only what the landlord types (indexes, prices, occupant counts, charge advances, bills, start and end dates). Every line the spreadsheet computes by formula (deltas, landlord and tenant shares, section totals, the settlement), the period status and whether a month is complete are computed by the app at display time and never written to the file. Stored computed values would go stale whenever an input is corrected, and keeping the formulas in code makes them testable.

The one stored flag that looks computed is `common.estimated`, which marks the estimated twelfth month (ADR 0011); a stored index alone cannot tell an estimate from a typed value.
