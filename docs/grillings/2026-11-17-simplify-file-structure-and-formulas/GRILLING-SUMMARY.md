# Grilling summary — simplify the file structure, the scenarios and the formulas (issue #106)

## Shared understanding

Implementing issue #57 showed that the period file and its business rules were more complex than they needed to be. This grilling went through the three files written for issue #106 (`docs/period-file-v2.md`, `docs/scenarios.md`, `docs/reference/sheet-formulas-v2.md`) and settled what the simpler design is. The three files are the new source of truth; the v1 documents, three ADRs and several grilling passages are replaced.

The main change is when values are shared between months. Today a month stores only what it typed and the app resolves the rest from earlier months at display time (ADR 0001, ADR 0005, `resolveValue`). In the new design the app copies the values into a month when it is initialized, so a month is read exactly as stored, with no resolution step. The same idea applies to meter indexes: each month stores both its previous and its current index, the previous one copied from the previous month's current index. This removes the special months (first month, tariff switch, meter replaced) and the "Compteur remplacé" action. What it costs is that a correction made in a past month no longer reaches later months by itself. The answer is one Yes/No dialog, offered after an edit of an inheritable value, that applies the new value to all the following months, and the same dialog mechanism keeps the next month's previous index in line when a current index is corrected.

The file grows one month at a time instead of holding twelve fixed months, and a period may start in any month, because it follows the tenant's entrance in the studio (for example, April to March is possible). Each month stores `startDate` and `endDate`; `endDate` replaces the reading date. Initializing the next month is a queued patch carrying the whole new month object, so it keeps the offline behaviour and the single commit per drain of the patch queue. The existing `2025-2026` file is converted once by a script to this shape with `schemaVersion: 2`, and the app reads only that shape.

Anything the app can compute stays out of the file: the period status (only `closedOn` is stored, as a date) and the month input status are computed. A figure with a missing input is "—", never zero. Two values stay for the tenant bill advance: the expected monthly advance, now one value at the top level of the file, and the amount actually received each month. The tariff mode and the day or month subscription unit stay as small enums, so the number of days is computed from the month's two dates. The estimated twelfth month is marked by a stored flag, which also blocks closing the period; closing keeps its confirmation and read-only lock and gets its own scenario.

In the formulas, the occupant split is a ratio everywhere, the water treatment shares now include the collection subscription (so the Excel sheet and the golden record must be regenerated to match), and the heat pump annual amount is still split over eleven months with the remainder in the twelfth month. The heat pump and settlement formulas of `sheet-formulas.md` stay valid and move into the new formulas file.

Past documents are cleaned in a way that keeps history readable: contradicted ADRs are marked superseded and one new ADR records the new decisions, `docs/agents/domain.md` tells agents to skip superseded ADRs, and past grilling summaries lose only the passages this grilling replaces.

## Decision index

- Q1 (v01): values shared with the previous month are copied into the new month at initialization; display-time inheritance goes away.
- Q2 (v01): every month stores both the previous and the current index of each meter.
- Q3 (v01): a period can start in any month, still twelve months, named after its start year and the next one.
- Q4 (v01): every month stores `startDate` and `endDate`; `endDate` replaces `readingDate`.
- Q5 (v01): only `closedOn` is stored; `draft`, `ongoing` and `ending` are computed.
- Q6 (v01): `inputStatus` is not stored; a month is complete when every required input is present.
- Q7 (v01): two tenant bill advance values, the expected one and the received one; the glossary term stays "actually transferred".
- Q8 (v01): a missing input makes every dependent figure uncomputable ("—").
- Q9 (v01): the current property names stay canonical; `period-file-v2.md` is corrected to them.
- Q10 (v01): the water treatment shares include the collection subscription. Correction found while writing the impact files: the sheet already includes it (rows 42 and 43), so only the v1 docs, the period file and the golden extraction script were missing it; the workbook is not changed.
- Q11 (v01): the occupant split is a ratio in every formula.
- Q12 (v01): the heat pump annual amount is split ROUND(annual / 12, 2) over eleven months with the remainder in the last one.
- Q13 (v02): the expected monthly advance is one top-level value; the received amount is per month.
- Q14 (v02): the heat pump remainder goes in the twelfth month of the period.
- Q15 (v02): each month keeps a stored `month: "YYYY-MM"`, set at initialization and never edited (a default you kept without having thought about it).
- Q16 (v02): the app suggests applying an inheritable-value edit to the following months.
- Q17 (v02): `tariffMode` (`base` or `hchp`) stays; only the registers of the mode are required and summed.
- Q18 (v02): `subscriptionUnit` stays an enum, `day` or `month`; the days are computed from the two dates.
- Q19 (v02): a stored flag marks the estimated twelfth month and blocks closing while set.
- Q20 (v02): `tenantName` stays as a label, added to Case 5 and Case 4 step 1.1.7.
- Q21 (v02): `closedOn` is a `YYYY-MM-DD` date.
- Q22 (v03): one Yes/No dialog applies the edited value to all the following months, with no equality guard.
- Q23 (v03): editing a current index offers to set the next month's previous index, in the same dialog mechanism.
- Q24 (v03): closing keeps today's rules adapted (twelve months, all complete, none estimated), with a new Case 7.
- Q25 (v03): initializing the next month is a queued patch whose value is the whole month object.
- Q26 (v03): the existing period is converted once by a script to `schemaVersion: 2`; the app reads only that shape.
- Q27 (v03): reopened, replaced by Q30.
- Q28 (v03): past grilling summaries lose only the replaced passages; a summary is deleted only when nothing in it stands.
- Q29 (v04): `docs/agents/domain.md` gets one sentence telling agents to skip superseded ADRs and not flag a contradiction with them.
- Q30 (v04): contradicted ADRs are marked superseded as ADR 0003, and one new ADR records the new decisions.

## Rejected alternatives

- Q1: display-time inheritance of today, because copy at initialization is the biggest single simplification.
- Q2: not storing the previous index, because it keeps the three special cases and the "Compteur remplacé" action.
- Q3: a period always starting in September, rejected in your words: "Let's not be closed on that", since the period depends on the tenant's entrance.
- Q4: storing only the reading date, rejected because "`endDate` replaces `readingDate`".
- Q5: storing a `status` value, because the `draft` to `ongoing` flip would write a second file and a stored value can go stale.
- Q6: storing `inputStatus`, because the missing-input highlights already need the per-input check.
- Q7: a single per-month advance, rejected in your words: "I prefer to keep the glossary term 'Tenant bill advance' from 'actually transferred'".
- Q8: counting a missing input as 0, because a silent zero on a bill is worse than a dash.
- Q9: adopting the v2 property names, because the code, fixtures and data repo already use the current ones.
- Q10: excluding the collection subscription from the shares, because you wrote it into v2 on purpose and you had spotted the sheet's omission as an error.
- Q12: putting the whole amount in the first month, and typing it by hand when the invoice arrives, because the split keeps the monthly balance smooth.
- Q13: one expected advance per month, because twelve copies could disagree with no use for it.
- Q14: the remainder in the calendar August, because "twelfth month" is the one rule that works for any start.
- Q15: identifying a month by its position or by its `startDate`, rejected in your words: "I didn't think about this and I prefer to keep the option B" (a stored `month` key).
- Q16: no suggestion and hand edits, rejected in your words: "When the water consumption and treatment bill comes, it is very like that user will edit March".
- Q17: no tariff mode with all six registers filled each month, or with zero-delta registers, because they mean monthly busywork or a silent-zero exception.
- Q18: the integer subscription unit, because a copied number of days is wrong in every month of a different length.
- Q19: no estimated flag, because nothing would stop closing a period with unread indexes.
- Q22: overwriting only the later months that still hold the old value, and asking month by month, rejected in your words: "all following months in period have suggested edits with a simple Yes/No dialog".
- Q23: a warning only, or nothing, because the same dialog fixes the problem instead of reporting it.
- Q24: closing with no confirmation ticks, because the confirmation protects the one irreversible action.
- Q25: a separate immediate write outside the queue, because it needs the network.
- Q26: the app reading both shapes, and leaving the old period alone, because one reader keeps the domain simple and the old period is the one the app is built for.
- Q27 and Q30: deleting the contradicted ADRs, and editing them in place, because deleting loses the reasoning and editing rewrites history; you asked whether keeping them adds noise, and the answer was that it does a little, solved by Q29.
- Q28: keeping every summary untouched with a note, and deleting the contradicted summaries entirely, because the first leaves contradicting text and the second drops decisions that still stand.
- Q29: the banner alone, and moving superseded ADRs to `docs/adr/superseded/`, because the first leaves agents reading them and the second breaks links and numbering.

## Decided without asking

These were not grilled; they follow from the answers or from your files. Object now if one is wrong.

- Current-suffixed indexes are not copied to a new month (your `period-file-v2.md` line 43 and scenario 3 step 3); only the previous indexes take the previous month's current index. The "can be inherited" label on current indexes in `period-file-v2.md` is corrected.
  - Approved.
- The heat pump `billedAmount` of each month is filled at the month's initialization from the top-level `heatPumpInvoiceEstimate` (months 1 to 11 ROUND(estimate / 12, 2), month 12 the remainder), stored and editable.
  - Correct
- `period-file-v2.md` becomes `period-file.md` and `sheet-formulas-v2.md` replaces `sheet-formulas.md` (with the heat pump and settlement formulas moved in); `docs/examples/2026-2027.json` is regenerated; the `status` line in the v2 example is removed.
  - Correct
- `settings`, `readingDate`, `readingDatePrevious`, `inputStatus` and the v1 `common.monthlyTenantBillAdvance` per-month key do not exist in the new shape; the per-period expected advance and `heatPumpInvoiceEstimate` sit at the top level; the estimated flag is `common.estimated`.
  - Correct
- The estimate rules of the closing grilling (30 % HC and 70 % HP split, delta of the previous period's twelfth month) are kept as they are.
  - Correct
- `GLOSSARY.md` is updated: a period is **at most** twelve months from any start; "Reading date" is replaced by the end date; "Estimated month" is defined by the stored flag; "bill" is "utility bill" and "delta" is "delta between the last and the current indexes" (the definitions you gave in the dropped #57 feedback).
  - Updated
- The new ADR is numbered 0007, and the validation rules follow the new shape: one to twelve months in order, each with a unique `month`, and `schemaVersion` 2.
  - Approved with a note: on the UI, we display only the months present in the period file.
- Scenarios 3 to 6 are corrected for the expected advance at the top level, the month key and the estimated flag, and all scenarios are converted to mermaid diagrams as the issue asks.
  - Approved
- Impact on the existing issues is not decided here; it is the next checklist item of #106, and any edit or closing of an issue on GitHub needs your go-ahead.
  - Correct
