# The app implements the intended formulas, not the spreadsheet cells

_Superseded on 2026-10-28: the export of "Suivi des charges de location (v2).xlsx" uploaded on 2026-10-28 fixes all three formulas below, so the fixed spreadsheet is the reference and the app's results match its cached values with no exception (grilling `2026-10-27-period-file-json-shape`, Q35)._

The spreadsheet "Suivi des charges de location (v2).xlsx" is the reference for the business rules, but the app does not reproduce it cell for cell. Three formulas in it are mistakes and the app implements the intended rule instead:

- Lines 64 and 65 swap the studio HC and HP deltas; the app computes the HC delta from the HC indexes and the HP delta from the HP indexes.
- The internet shares from column E onward read the bill eight columns to the right; the app uses each month's own internet bill.
- The settlement text in `A5` leaves the heat pump maintenance out while the amount in `O5` includes it; the app includes it in both.

Numbers computed by the app can therefore differ from the spreadsheet for the months these formulas touched.
