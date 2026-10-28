# Grilling round v08 — period file JSON shape (issue #5)

Refreshed a third time on 2026-10-28 from your chat answers and the spreadsheet as it stands now. No answer slot of the earlier versions was filled. Question numbers are kept; a re-asked or follow-up decision takes a letter suffix.

## Settled in v07

Nothing: Q31 was put on hold. It is replaced by Q37 below.

## Settled from your chat answers

- Q32: August 2026 studio base previous index fixed in `Période-092025-092026`. The studio series is still open, see Q32d.
- Q33 / Q33b: the 2025-2026 reading dates are correct as they are in the sheet, including October and November 2025 both ending on 2025-11-15: readings were not taken regularly. The golden record uses the sheet's dates as they are, so November 2025 has a 0-day window. This replaces my reading of Q33 as "2025-11-01".
- Q34: there is a payment input, and it is `tenantBillAdvance`. Where the old 237.28 payment goes is Q34b.
- Q40 / Q40b: `"schemaVersion": 1`, an integer.
- Q41b (from your Q34 answer): `tenantBillAdvance` holds the amount the tenant actually paid that month, not the amount due. It replaces `chargeAdvanceReceived`. Its name and place are Q41c and Q41d.

## What the spreadsheet says now

- 2025-2026 settlement: "Locataire doit au Bailleur 230.88" (advances 600). 2026-2027 so far: 180.78 owed (advances 140).
- All three ADR 0003 anomalies are gone from the sheet (Q35).
- 2025-2026 studio base, May to August: current 2063.5, 2063.5, 2063.5, 2493.6, with August's previous typed as 2209.8 (M58). So June and July consume 0 kWh on Base, and August 283.8 kWh. Q32d asks about this.
- 2026-2027 M58 (August 2027, studio base previous) still holds `=2343.6+4.15` (Q32c).
- `docs/reference/sheet-formulas.md` is two layouts behind (Q47).

## What `period-model-schema.json` says now

```json
{
  "schemaVersion": "1",
  "periodName": "2025-2026",
  "settings": {},
  "months": [
    {
      "month": "2025-09",
      "tenantBillAdvance": 0,
      "common": {},
      "waterConsumption": {},
      "waterTreatment": {},
      "waterSoftener": {},
      "electricity": {},
      "internet": {},
      "heatPumpMaintenance": {}
    },
    ...
  ]
}
```

## Reopened

- Q2 (sparse months), Q10 (`settings` content), Q12 (`period`), Q16 (every key two levels below the month), Q17 (no empty objects) and Q19 (section names) are reopened by the JSON.
- Q12 of the breakdown (the received advance, suggested from a period-level monthly advance) is reopened by `tenantBillAdvance` (Q41c to Q41f).
- Q7 of the breakdown (the heat pump split) is reopened by 2025-2026's heat pump being billed as 154 in August only (Q36).

## Q32c - The leftover in 2026-2027 August

`Période-092026-092027` M58 (August 2027, studio base previous) is still `=2343.6+4.15` instead of `=L59` like the other months. Your fix went to M58 of `Période-092025-092026`. It has no effect until next August, but it would break the 2026-2027 golden record.

a. It should be `=L59`; you fix it in the 2026-2027 sheet.
b. It is intended.

➡️ Recommendation: a.

### Answer to Q32c

A

## Q32d - Which 2025-2026 studio base readings are right for June, July and August

Now, row 59 reads 2063.5 for May, June and July, then 2493.6 for August, and August's previous index is typed as 2209.8. Between July's current (2063.5) and August's previous (2209.8), 146.3 kWh are billed to no one. The earlier versions had June at 2209.8 (146.3 kWh in June).

a. June 2209.8 (146.3 kWh), July 2209.8 (0 kWh on Base, the month billed on HC/HP), August previous `=L59` (2209.8) and current 2493.6 (283.8 kWh). No kWh is lost.
b. June and July really have no Base reading (2063.5). August's previous index should be `=L59` (2063.5), so August is billed 430.1 kWh.
c. The sheet is right as it is, and the 146.3 kWh gap is intended (please say why).

➡️ Recommendation: a, if June was read at 2209.8. The earlier versions of the sheet had that value, and it bills every kWh exactly once. Only your readings can decide between a and b.

### Answer to Q32d

I updated the Excel to fit the 12 months, set the right "Au" dates and respective reading for water consumption, treatment and electricity.

## Q34b - Where the 237.28 settlement payment goes

The old sheet counted a "Paiement du recouvrement" of 237.28 in the 2025-2026 settlement. The current sheet has no such amount: row 8 is 50 in every month, and the balance is 230.88 owed by the tenant. If the 237.28 was paid against this balance, 2025-2026 actually ends with the landlord owing 6.40.

a. Add it to the `tenantBillAdvance` of the 2025-2026 month in which it was paid (e.g. August: 50 + 237.28 = 287.28). The 2025-2026 settlement then shows the landlord owing 6.40.
b. Record it in the month in which it was paid, but as a separate key (e.g. `common.settlementPayment: 237.28`), counted in the settlement with the advances. `tenantBillAdvance` stays the regular monthly transfer.
c. Do not record it: it settled the old 13-month computation, which no longer exists.

➡️ Recommendation: b. The settlement counts it the same way as in a, but the regular advance stays readable (50 every month, not 287.28 once). The next month's suggestion (Q41f) is not thrown off either. Please also write in which month it was paid, and whether you add it to the sheet for the golden record.

### Answer to Q34b

None of the option. Should be a read-only view that I'd use to follow the balance `Avance sur charges - Consommations`.

## Q35 - What becomes of ADR 0003

ADR 0003 says the app implements the intended formulas where the sheet is wrong, and lists three anomalies. The fixed sheet has none of them.

a. Mark ADR 0003 as superseded: the fixed sheet is the reference, and the Vitest cases expect its cached values with no exception.
b. Keep ADR 0003 as it is, as a record of why older exports differ.

➡️ Recommendation: a, with a one-line note naming the export that fixed it.

### Answer to Q35

ADR 0003 seems superseded with the new Excel extract.

## Q36 - How the heat pump maintenance is stored

2025-2026 bills the heat pump as 154 in August only (no monthly charge was planned then). 2026-2027 splits it into 12.83 per month, with 12.87 in August. Your JSON has a `heatPumpMaintenance` section in every month.

a. A monthly input, `heatPumpMaintenance.billedAmount`, not inherited. For a new period, the app offers the 12-way split from an annual amount. 2025-2026 stores 154 in August only.
b. A period setting (annual amount) plus a split mode (`"monthly"` / `"lastMonth"`); there is then no `heatPumpMaintenance` in a month.

➡️ Recommendation: a. It matches your JSON and both periods exactly, and follows ADR 0001: what is billed each month is what is stored. Not inherited, because an inherited 12.83 would continue after a one-off charge.

### Answer to Q36

A

## Q37 - Which October 2026 values the example stores (replaces Q31)

October differs from September only on: reading date 15/11/2026, charge advance 70, internet `=20.99+2.49`, CTA 2.42 (September 2.34), and softener unit price 0 (quantity 0, so no purchase, Q30). From November on, the months hold values copied from 2025-2026 and no charge advance.

a. October stores the reading date, the charge advance, the internet bill (23.48) and the CTA (2.42). Nothing is stored after October.
b. Same as a, without the CTA, if 2.42 is a placeholder like the later months.

➡️ Recommendation: a if 2.42 is on the October electricity bill, b otherwise.

### Answer to Q37

All this is resolve with Refreshed Excel doc.

## Q38 - One file per period

`period-model-schema.json` holds the whole period in one object. I read this as dropping the folder with a file per section.

a. One file per period, at `periods/YYYY-YYYY.json`.
b. The folder with a file per section is still wanted, and this JSON shows the content once merged.

➡️ Recommendation: a. One file keeps a drain atomic with the GitHub Contents API (ADR 0004): one `PUT`, one commit, one SHA to check on load.

### Answer to Q38

A

## Q39 - What the period identifier is called

Your JSON uses `"periodName": "2025-2026"`; Q12 settled `"period"`.

a. `periodName`.
b. `period`.

➡️ Recommendation: a. It is your name, and nothing else depends on the key. The patch keeps its `period` property (ADR 0004), which references the file and is not a field in it.

### Answer to Q39

A

## Q41c - What the charge advance key is called

The glossary's term is **Charge advance** (_Avance sur charges_), and it lists "provision, deposit" as words to avoid. `tenantBillAdvance` is a third name.

a. `chargeAdvance`, after the glossary term.
b. `tenantBillAdvance`, and the glossary gains it as an alias.

➡️ Recommendation: a. One concept, one name across the glossary, the code and the file. "Bill" also clashes with the sections' `billedAmount`, a different thing.

### Answer to Q41c

Replace `chargeAdvance` with `tenantBillAdvance` because the new name holds "from who the charges come from"

## Q41d - Where the charge advance sits in a month

Your JSON puts it directly in the month object, next to the sections. Q16 put it in `common` so that every key sits two levels below the month, and Q15b relies on it: a patch `field` is always `"<section>.<key>"`.

a. In `common`: `"common": { "chargeAdvance": 70, ... }`, patch field `"common.chargeAdvance"`.
b. Directly in the month, as in your JSON. Its patch field is `"chargeAdvance"`, with no dot, and the apply function handles that one case.

➡️ Recommendation: a. It keeps one rule for every patch and for Q25's validation; `common` exists for inputs that belong to no section.

### Answer to Q41d

Ok for A

## Q41e - What a month without a payment holds

Your JSON writes `"tenantBillAdvance": 0` in every month. Q4 made an explicit `0` mean "typed 0", and an absent key mean "nothing typed". The advance is not inherited (Q7).

a. Absent until a payment is recorded; `0` only when you record that the tenant paid nothing that month.
b. `0` in every month from the period's creation, overwritten when the payment arrives.

➡️ Recommendation: a. The table can then tell "not recorded yet" from "the tenant did not pay", and the provisional settlement (Q25 of the breakdown) can say how many months are missing.

### Answer to Q41e

I prefer B.

## Q41f - Where the suggested advance comes from

The breakdown's Q12 offers a one-click suggestion for each month's payment. With the received amount in each month (Q41b), the suggestion needs a source. `settings` is empty in your JSON.

a. `settings.monthlyChargeAdvance` (70 for 2026-2027), typed when the period is created; every month's suggestion uses it. The settlement's "next period's charge advance" (glossary: **Settlement**) is what you type there for the next period.
b. The previous month's payment; the first month has no suggestion.

➡️ Recommendation: a. The advance is set once per period (50, then 70), and b would suggest a one-off amount after an unusual month, such as a settlement payment under Q34b a.

### Answer to Q41f

A

## Q42 - Months as a fixed array of twelve

Your JSON writes `months` as an array of all twelve months, in order, each with its `month` key. Q2 settled a sparse object keyed by month. My earlier objection (two devices adding a month in different orders) does not hold when all twelve are written as the period is created.

a. The array, always twelve entries from September to August, created with the period. A patch still says `month: "2026-10"`, and the app finds the entry by its `month`. Q25 refuses a file whose array is not exactly the twelve months in order.
b. Back to the sparse object keyed by month.

➡️ Recommendation: a. It reads like the sheet's twelve columns, gives a stable diff (Q27), and costs only a lookup by `month`.

### Answer to Q42

A

## Q43 - Whether empty sections stay in the file

Your JSON keeps every section in every month, even when empty. Q17 settled removing empty sections and months.

a. Every month always holds all its sections; emptying the last key leaves `{}`.
b. Back to Q17.

➡️ Recommendation: a. It follows from Q42, and the apply function then never creates or removes a parent object.

### Answer to Q43

A

## Q44 - The section names

Your JSON renames `water` to `waterConsumption` and `softener` to `waterSoftener`.

a. `common`, `waterConsumption`, `waterTreatment`, `waterSoftener`, `electricity`, `internet`, plus `heatPumpMaintenance` under Q36 a, in that order.
b. Back to Q19's `water` and `softener`.

➡️ Recommendation: a. `waterConsumption` matches "Consommation Eau" and sits next to `waterTreatment` without ambiguity. Q27 writes the file in your JSON's order.

### Answer to Q44

A

## Q45 - The values inside a section

Your JSON leaves the sections empty. Your earlier sketch wrapped each value as `{ "value": ..., "type": ... }`, and Q11 / Q19 settled plain values, typed by the field catalogue.

a. Plain values (`"mainMeter": 533.117`), with the type fixed by the catalogue.
b. The `{ value, type }` wrapper (please write what `type` holds).

➡️ Recommendation: a. JSON already separates numbers from strings, and the catalogue fixes which keys are dates. A wrapper gives each key two places to be wrong, and makes a patch path three levels deep.

### Answer to Q45

A

## Q46 - Where the reading window lives

Your earlier sketch had `startDate` / `endDate` in every month; your JSON has neither. Q10 of the breakdown, and the sheet's "Période" block ("Du" = `=B11`), keep one window for all sections.

a. One stored date per month, `common.readingDate` ("Au"), with "Du" computed from the previous month, and `common.readingDatePrevious` in the first month.
b. `common.startDate` and `common.endDate`, both stored every month.

➡️ Recommendation: a. A stored "Du" can disagree with the previous "Au", and the sheet itself computes it.

### Answer to Q46

A.

BTW, update the JSON schema.

## Q47 - How `docs/reference/sheet-formulas.md` follows the new layout

Its row numbers are two layouts old (the water delta, `=B10-B9` there, is now `=B14-B13`).

a. I regenerate it from the fixed sheet once Q32c and Q32d are settled, keeping your structure (one heading per line, label and row number, formula), and adding the "Période" and "Avance sur charges - Consommations" rows.
b. You update it yourself.

➡️ Recommendation: a. It is mechanical, and waiting for Q32c / Q32d avoids regenerating it twice.

### Answer to Q47

A
