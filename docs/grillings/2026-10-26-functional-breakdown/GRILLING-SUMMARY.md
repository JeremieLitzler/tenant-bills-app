# Grilling summary — functional breakdown of the tenant bills app

Session started 2026-10-26, rounds v01 to v05. Domain docs written along the way: `GLOSSARY.md` and `docs/adr/0001` to `0004`.

## Shared understanding

The app replaces the spreadsheet "Suivi des charges de location (v2).xlsx" for the landlord's monthly routine: recording the tenant's charge advance, the meter readings and the prices of each section (water consumption, water treatment, electricity, water softener, internet, heat pump maintenance), and seeing at any time who owes what to whom. It is in French, used by the landlord alone in v1, on a computer (a sheet-like period table) and on a phone (a one-month entry form), online or offline.

The spreadsheet is the reference for the business rules, not a layout to copy cell for cell. Three things changed from it during the grilling, and the reasons matter for anyone comparing numbers later:

- **Twelve months, not thirteen** (ADR 0002). The sheets hold 13 month columns and count September in two periods. The overlap came from the irregular first months of 2025-2026, not from a rule, and it forced a manual "Réajustement" settlement line. A period is now exactly September to August, starting and ending aroumd the 15ht of September.
- **Intended formulas, not the sheet's cells** (ADR 0003). The studio HC/HP deltas are swapped in the sheet, the internet shares read the wrong column from E onward, and the settlement text leaves out the heat pump. The app implements what was meant, so its numbers can differ from the sheet on those months.
- **Inputs only** (ADR 0001). The JSON stores what is typed; every delta, share, bill and settlement figure is computed. An unedited cell stores nothing and inherits the previous month's value, the way the sheet's `=C18` formulas do. Emptying a cell removes its override.

Monthly data entry follows the routine described in the README. The reading date ("Au") is shared by all sections. It is suggested as the 15th when that is Thursday to Sunday, otherwise the Sunday before, and you can always change it. "Du" is the previous reading date. "Previous index" lines are read-only except in a period's first month. Electricity has a per-month tariff mode (Base or HC/HP) and a per-month subscription unit (per day or per month), both inherited, because the supplier changed in August 2026. The tenant pays 100% of the heat pump maintenance, 154/12 per month (rounded to 2 decimal ; sum of the 12 parts must equal to 154, one month will be `[annual charge] - ROUND([annual charge] / 12; 2) * 11`). Implausible values are flagged, never blocked.

Storage follows `french-gas-stations-scraper` for auth (GitHub OAuth App, Netlify functions, HTTP-only cookie) and for the GitHub Contents API proxy. It differs in four ways. The data repo is fixed (`JeremieLitzler/tenant-bills-data`, one `periods/YYYY-YYYY.json` per period) but it read from an environment variable. Sign-in is restricted to an allowlisted login (also an environment variable). The app checks the remote SHA on every load. Saving is a per-cell patch queue instead of whole-file writes with manual conflict handling (ADR 0004). The queue was the one part that needed a second pass: the first sequence diagram read as too complex, and the flowchart in v05 (five triggers calling a single `drainQueue()`, at most one `PUT` at a time, one automatic retry on 409) is the approved version.

v1 scope ends at a manual "Nouvelle période". v2 will prefill it from the previous period and may add a tenant view. The spreadsheet's history is not imported: the two 2026-2027 months already entered are typed again.

## Decision index

- Q1 (v01): only the landlord signs in and edits in v1.
- Q2 (v01): a period is 12 months, September to August; no overlap month, no manual adjustment line.
- Q3 (v01): the JSON stores inputs only; all formula lines are computed.
- Q4 (v01): unedited cells store nothing and inherit the previous month's value, shown as "inherited".
- Q5 (v01): previous-index lines are read-only except in a period's first month.
- Q6 (v01): the app implements the intended formula for the three sheet anomalies.
- Q7 (v01): the tenant pays 100% of the heat pump maintenance, 154/12 per month, remainder on the last month, amount editable per period.
- Q8 (v01): electricity has a per-month inherited tariff mode (Base or HC/HP); only relevant rows show.
- Q9 (v01): electricity has a per-month inherited subscription unit (per day or per month).
- Q10 (v01): "Du/Au" is the reading window for every section; "Au" is the month's reading date.
- Q11b (v02): suggested reading date is the 15th if Thu-Sun, otherwise the Sunday before; always overridable.
- Q12 (v01): the charge advance stores the amount received only, with a one-click suggestion from the period's monthly advance.
- Q13 (v01): v1 includes a computed, read-only settlement view.
- Q14b (v02): SHA check against the remote file on every load, plus a manual "Rafraîchir"; both refused while edits are queued.
- Q15 (v01): code, JSON keys, commits and docs in English; UI in French; glossary maps the two.
- Q16 (v02): data repo fixed in Netlify env vars; one file per period at `periods/YYYY-YYYY.json`; proxy limited to that repo.
- Q17 (v02): a drain sends every queued patch as one `PUT`; edits made meanwhile wait for the next drain.
- Q18 (v02): on 409, pull, re-apply queued patches, retry once; the queued edit wins.
- Q19 (v02): offline edits accepted with a pending-count badge, and the app is offline-ready with a service worker.
- Q19b (v03): installable PWA built with `vite-plugin-pwa`.
- Q19c (v03): new versions apply only through a "Nouvelle version disponible — Recharger" prompt.
- Q20 (v02): period table on large screens, "Saisie du mois" form on small screens, same queue.
- Q21 (v02): v1 "Nouvelle période" is filled by hand; prefill from the previous period is v2.
- Q22 (v02): no spreadsheet import.
- Q23 (v02): softener description and quantity are not inherited; unit price is. Corrected by Q7b of `docs/grillings/2026-10-27-period-file-json-shape`: the unit price is not inherited either.
- Q24 (v03): the auth callback refuses any GitHub login outside an env-var allowlist.
- Q25 (v03): the settlement is available for any period, labelled "provisoire" until closed.
- Q27 (v03): implausible values are saved with a warning, never blocked.
- Q28 (v03): formulas are pure TypeScript functions, Vitest-tested against the sheet's computed values except where ADR 0003 applies.
- Q29 (v03): v1 features F1 to F10, built in the order F10, F1, F2, F3, F4, F5, F6, F7, F8, F9.
- Q30b (v04): emptying a cell removes its override; inheritable cells fall back to the inherited value, others go empty and dependent amounts show "—".
- Q31b (v05): the save queue flowchart (five triggers, one `drainQueue()`, one `PUT` at a time) is approved.

Superseded: Q11 by Q11b (the golden record did not follow one rule); Q14 by Q14b (the scraper uses cache staleness, not a check on every load); Q17b by Q31b (the sequence diagram was replaced by a simpler flowchart); Q26 by Q30b (the answer was a request for an example). Q19's answer replaced my own "no service worker in v1".

## Rejected alternatives

- Q1 (v01): a tenant with read-only access, or both of you editing. Out of v1 ("for now, a"); a tenant view would change auth and data exposure.
- Q2 (v01): thirteen months, as in the sheet. The thirteenth column came from the irregular first months of 2025-2026; September belongs only to the new period.
- Q3 (v01): storing the computed lines too. They go stale when an input changes, and formulas should be testable code, not data.
- Q4 (v01): copying the previous month's value into each new month. A later correction of an earlier month would not propagate, and the two would diverge silently.
- Q6 (v01): reproducing the sheet's three formula anomalies cell for cell. The app implements the intended formulas (ADR 0003, later superseded when the sheet was fixed).
- Q8 (v01): always showing the Base, HC and HP electricity rows. Half of them are zeros in any month.
- Q9 (v01): subscription billed only per day, or only per month. Both appear in the history, and the August 2026 supplier has no daily rate.
- Q11 (v01): suggesting the earliest Thu-Sun day before the 15th, or the closest Thu-Sun day before or after. The golden record did not follow one rule (Q11b), so the Sunday before the 15th was kept and the two exceptions are manual choices.
- Q13 (v01): leaving the settlement view to later. Every number on it is derived from data the app already holds.
- Q14 (v01): a single device. Readings are taken on the phone and the table is reviewed on the computer.
- Q14b (v02): checking the remote file only on load, or only by scraper-style cache staleness. Both were kept (SHA check on every load plus a manual "Rafraîchir"), because a stale copy is likely after a few days on the other device and a tab can stay open for long.
- Q17 (v01): one `PUT` per queued edit (about ten commits to fill a month), or an explicit "Enregistrer les modifications" button as in the scraper. A single drain keeps save on blur and gives one or two commits.
- Q18 (v02): the scraper's behaviour on a 409 (error, manual pull, queued edits discarded). Losing a meter reading typed on the phone is worse than overwriting a value you just retyped.
- Q19 (v02): no service worker in v1. You wanted the app offline-ready, so it is installable too (Q19b).
- Q19c (v03): applying a new app version automatically on the next load. A reload while a cell is being edited could lose a value not yet blurred.
- Q20 (v02): the same table everywhere, scrolling horizontally. Twelve columns by about sixty rows is hard to use on a phone.
- Q21 (v02): prefilling "Nouvelle période" from the previous period in v1. You create a period once a year, so it waits for v2 (narrowed by the period-closing session).
- Q22 (v02): importing one or both sheets. About 30 cells to type, and 2025-2026 has the 13-month layout the app does not model. Reversed for 2025-2026 by the period-closing session (Q16).
- Q25 (v03): a settlement only for a closed period. A running balance tells you during the year whether the advance is still right.
- Q27 (v03): blocking implausible values on save. Meter replacements and typos you fix later are both real, and blocking on blur would lose the value.
- Q29 (v03): starting the build with auth or the formulas. F10 (hosting and CI) goes first, because F1 onward need the Netlify site and its environment variables.
- Q31b (v05): dropping the automatic 409 retry to simplify the save queue (a conflict would keep the patches queued behind a "Réessayer" button). The flow was approved as drawn.
