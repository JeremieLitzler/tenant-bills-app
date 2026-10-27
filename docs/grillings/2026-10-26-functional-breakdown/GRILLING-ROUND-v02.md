# Grilling round v02 — functional breakdown of the tenant bills app

## Settled in v01

- Q1: only you (the landlord) sign in and edit in v1. A tenant view may come later.
- Q2: a period has 12 months, September to August. The 13th column came from the irregular first months of 2025-2026 (rows 70-71), and the "septembre N+1" column goes away, together with the manual "Réajustement" settlement line. Recorded in `docs/adr/0002-twelve-month-periods.md`.
- Q3: the JSON stores inputs only; every formula line is computed by the app. Recorded in `docs/adr/0001-store-inputs-compute-everything-else.md`.
- Q4: an unedited cell has no stored value and inherits the previous month's value at display time, styled as "inherited".
- Q5: "previous index" lines are read-only, except in the first month of a period where you type them.
- Q6: the app implements the intended formula for the three anomalies (HC/HP studio deltas, internet column offset, PAC in the settlement). Recorded in `docs/adr/0003-intended-formulas-over-spreadsheet-cells.md`.
- Q7: the tenant pays 100% of the heat pump maintenance, 154/12 per month with the rounding remainder on the last month; the 154 € amount is editable per period.
- Q8: each month has an electricity tariff mode (Base or HC/HP), inherited from the previous month, and only the relevant rows are shown and computed.
- Q9: each month has a subscription unit (per day or per month), inherited from the previous month. Context: the supplier changed in August 2026 and the new one has no daily rate.
- Q10: the "Du / Au" dates (lines 70-71) are the month's reading window for every section, not only electricity. "Au" is the month's reading date; "Du" is the previous month's reading date.
- Q12: line 7 stores only the amount received (empty means "not received yet"), with a one-click suggestion equal to the period's monthly charge advance. No payment date.
- Q13: v1 includes a read-only settlement view computed from the period data.
- Q15: code, JSON keys, commits and docs in English; UI in French; `GLOSSARY.md` maps the French labels to the English terms. The glossary now exists at the repo root.
- Q14 is only partly settled: see Reopened.

## Reopened

- **Q11** (reading date suggestion): you named the 2026/2027 "Au" dates as the golden record, but they do not follow one rule, so Q11b asks which rule the suggestion implements.
- **Q14** (several devices): you picked "a" (compare with the remote file on every app load) and "same logic as the french gas station scraper". The scraper does not check on every load: it reuses its IndexedDB copy until `revalidateCacheDays` have passed, and offers a manual "Refresh data" pull. Q14b asks which one you want.

## Q11b - Which rule produces the golden record

The 2026/2027 "Au" dates, with the weekday of the 15th:

- 15th on Thu, Fri, Sat or Sun: the 15th is used (Jan, Apr, May, Jul, Aug, Nov), **except** October 2026 (Thu 15 > Sun 11).
- 15th on Mon: Sun 14th (Feb, Mar).
- 15th on Tue: Sun 13th (Sep 2026 "Du", Dec 2026), **except** June 2027 (Tue 15 > Mon 14).
- 15th on Wed: no case inside the period (the dropped September 2027 column used Sat 11).

Proposed rule: 15th if Thu-Sun; otherwise the Sunday before the 15th (Mon > 14th, Tue > 13th, Wed > 12th). October 2026 and June 2027 are then one-off choices you made by hand, which the date picker allows.

➡️ Recommendation: yes to the proposed rule. It reproduces 10 of the 12 dates and the two exceptions look like personal-agenda choices rather than a rule. If Wednesday should give Saturday 11th (as in September 2027), say so.

### Answer to Q11b

Use the rule, but remember that "Au" can be overridden by user.

## Q14b - When the app pulls the remote file

- a. On every app load, compare the remote file SHA with the local copy and pull when they differ (one GitHub API call per load).
- b. As the scraper does: reuse the IndexedDB copy until `revalidateCacheDays` have passed, plus a manual "Rafraîchir" action.
- c. Both: SHA check on every load, plus the manual action.

➡️ Recommendation: c. With two devices editing the same month, a stale copy is likely after a few days on the other device, and a SHA check is cheap. The manual action covers a tab that stays open for long. The pull is refused while local edits are still queued (see Q17).

### Answer to Q14b

C

## Q16 - Data repository and file naming

The data lives in the private repo `JeremieLitzler/tenant-bills-data`. The scraper lets the user type `owner/repo` and the file path in a settings form.

➡️ Recommendation: the repo is fixed in Netlify environment variables (no settings form), the proxy function only accepts paths inside that repo, and each period is one file named after its first and last year, e.g. `periods/2026-2027.json`. The app lists the `periods/` folder to know which periods exist.

### Answer to Q16

Use Recommendation

## Q17 - How queued edits reach GitHub

Each blur puts the edited cell in an IndexedDB queue, and only one write call runs at a time.

- a. One `PUT` (one commit) per queued edit, sent one after the other.
- b. A worker drains everything queued at the time it starts and sends it as one `PUT` (one commit); edits made during that call wait for the next drain.
- c. As the scraper's station list: edits stay local until you click "Enregistrer les modifications".

➡️ Recommendation: b. It keeps "saved on blur" without an explicit button, and filling a month (about 10 cells) gives one or two commits instead of ten.

### Answer to Q17

Ok for B, but a mermaid diagram will be needed so I can approve that.

## Q18 - Conflict on write (409)

A write fails with a 409 when the remote file changed since the app last read it (an edit from the other device).

- a. As the scraper: show an error and require a manual pull, which discards the queued edits.
- b. Automatic: pull the remote file, re-apply the queued cell edits on top of it (each edit is "set this cell of this month to this value"), and retry once. If the same cell was changed on both sides, the queued (newer) edit wins.

➡️ Recommendation: b. Edits are per cell, so re-applying them is safe, and losing a meter reading typed on the phone would be worse than overwriting a value you just re-typed.

### Answer to Q18

B

## Q19 - Offline editing

When there is no network (taking readings in the cellar, for example), edits could still be accepted.

➡️ Recommendation: yes. Edits always go to IndexedDB and the queue first; the queue drains when the network and the auth session are back, and a badge shows the number of edits not yet sent. No service worker or installable app in v1.

### Answer to Q19

Yes, using a service work to make the app offline ready.

## Q20 - Entering readings on a phone

The period table has 12 month columns and about 60 rows, which is hard to use on a phone.

- a. The same table everywhere, scrolling horizontally on small screens.
- b. The table on large screens, plus a "Saisie du mois" form on small screens showing only the inputs of one month, grouped by section.

➡️ Recommendation: b. Both write the same cells through the same queue, so it is one extra view and no new data.

### Answer to Q20

B

## Q21 - Creating a period

A period needs its first month's previous indexes (Q5), prices and occupant counts, and its monthly charge advance and heat pump amount.

- a. v1 has a "Nouvelle période" action where you type all of it.
- b. v1 has "Nouvelle période", prefilled from the previous period's last month (current indexes become the previous indexes, prices and occupants carried over, charge advance from the settlement's "Nouvelle annualisation"), all editable.

➡️ Recommendation: a for v1, b as a later feature. The README calls the prefill "later", and you create a period once a year.

### Answer to Q21

We're at the start of current period, so A to start. We'll look at B in a v2.

## Q22 - Importing the spreadsheet

The current period (2026-2027) already has September and October values in the spreadsheet.

- a. A one-off import script writes `2026-2027.json` from the spreadsheet.
- b. A one-off import of both 2025-2026 and 2026-2027, so the 2025-2026 settlement is also visible in the app.
- c. No import: you type the 2026-2027 months already entered.

➡️ Recommendation: c. Two months is about 30 cells, and the 2025-2026 sheet has the 13-month layout and the irregular first months the app does not model (ADR 0002), so an import would be more work than typing. Pick a or b if you want the history in the app.

### Answer to Q22

C

## Q23 - Water softener inputs

Lines 80-82 hold a description, a quantity and a unit price; purchases are occasional.

➡️ Recommendation: the quantity and the description are not inherited (empty means no purchase that month), the unit price is inherited (Q4).

### Answer to Q23

Recommendation is correct.
