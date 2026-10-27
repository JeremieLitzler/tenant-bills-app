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
- Q23 (v02): softener description and quantity are not inherited; unit price is.
- Q24 (v03): the auth callback refuses any GitHub login outside an env-var allowlist.
- Q25 (v03): the settlement is available for any period, labelled "provisoire" until closed.
- Q27 (v03): implausible values are saved with a warning, never blocked.
- Q28 (v03): formulas are pure TypeScript functions, Vitest-tested against the sheet's computed values except where ADR 0003 applies.
- Q29 (v03): v1 features F1 to F10, built in the order F10, F1, F2, F3, F4, F5, F6, F7, F8, F9.
- Q30b (v04): emptying a cell removes its override; inheritable cells fall back to the inherited value, others go empty and dependent amounts show "—".
- Q31b (v05): the save queue flowchart (five triggers, one `drainQueue()`, one `PUT` at a time) is approved.

Superseded: Q11 by Q11b (the golden record did not follow one rule); Q14 by Q14b (the scraper uses cache staleness, not a check on every load); Q17b by Q31b (the sequence diagram was replaced by a simpler flowchart); Q26 by Q30b (the answer was a request for an example). Q19's answer replaced my own "no service worker in v1".
