# Grilling round v10 — period file JSON shape (issue #5)

## Settled in v09

- Q36b: `settings.heatPumpAnnualAmount` is dropped. The app asks for the annual amount when it offers the 12-way split and writes the twelve `billedAmount` values only.
- Q37b: the example treats October 2026's typed copies of September's values as inherited. October stores `common.tenantBillAdvance` 70, `internet.billedAmount` 23.48, `electricity.cta` 2.42 and `heatPumpMaintenance.billedAmount` 12.83.
- Q37c: a reading date is stored only once the reading is taken. The example stores `readingDate` for September 2026 (2026-10-11) only.
- Q41g: the glossary term is now **Tenant bill advance** (_Avance sur charges_). "Charge advance" is under _Avoid_. I also added **Balance** (_Avance sur charges - Consommations_) for the read-only view from Q34b, and rewrote **Tenant** and **Settlement** with the new term.
- Q41h: `tenantBillAdvance` is always present and 0 means "nothing received". Clearing the cell writes 0. The suggestion is offered on any month at 0, Q25 refuses a month without the key, and Q4 is unchanged for every other key.
- Q48: water indexes are stored in litres, as integers. The 2026-2027 example stores the main meter as 525690 (opening) and 533117, and the studio meters as 13992 / 14614 and 18676 / 19685. The app shows m³. The 2026-2027 sheet still types m³ with no division; the shares are the same either way.
- Q49: B19 is now a typed 0 (checked).
- Q50: you replaced the 2025-2026 studio readings with estimates. October 2025's treatment shares are now 6.10 / 1.45. The estimates create the two anomalies in Q50b and Q50c.

## Reopened

- Q10 / Q41f: `settings.monthlyChargeAdvance` still carries the old term (Q41i).

## Q50b - September 2025: the main meter does not move, the studio meters do

In `Période-092025-092026` column B, the main meter reads 401454 as both previous and current (0 m³ from 2025-09-14 to 2025-10-25). The estimated studio readings move 2.009 + 2.968 = 4.977 m³. The landlord's treatment share is therefore -8.01 and the tenant's 8.01 (rows 48-49). Water consumption gives the landlord 4.43, the subscription only.

a. The main meter was not read on 2025-09-14: you replace B13 (previous) with an estimate as well, so that September's main delta covers the studio's 4.977 m³.
b. It stays as it is; the golden record keeps -8.01.
c. Another fix (please write which).

➡️ Recommendation: a. The studio meters are behind the main meter, so over the same window the main delta cannot be smaller than their sum. A negative landlord share in the golden record would then become a test case the app must reproduce.

### Answer to Q50b

(From chat: "I refreshed the excel.") Checked: September 2025's main meter now runs 403990 > 418709 (14.719 m³), more than the studio meters' 2.009 + 1.968. The shares are 17.29 / 6.40 for treatment and 29.74 / 7.95 for water consumption.

## Q50c - October 2025: the softened studio meter goes backwards

The estimate for September's studio softened meter (B20) is 2968. October's reading (C20) is 2944, so October's delta is -0.024 m³ (row 21).

a. The September estimate must be at most 2944; you lower B20 (for example to 2944 minus a few litres).
b. October's 2944 is the wrong one (please write the right value).
c. It stays; a negative delta is accepted.

➡️ Recommendation: a. A meter cannot run backwards, and an estimate is the value you can choose. If b or c, the app must accept a negative delta, which Q25's validation would otherwise be free to refuse.

### Answer to Q50c

(From chat: "I refreshed the excel.") Checked: September's softened studio estimate is now 1968, so October runs 1968 > 2944 (0.976 m³). No delta is negative from September to November 2025.

## Q51 - Whether an estimated reading is marked in the file

The 2025-2026 studio readings for September are estimates, not readings.

a. No mark. A stored index is a stored index; an estimate is your business, and the file stays as Q19's catalogue.
b. A flag per meter and month, for example `"studioSoftenedMeterEstimated": true`, shown in the table.

➡️ Recommendation: a, unless you expect to estimate readings in the app too (a missed reading day). The golden record needs only the numbers, and b adds a key for every meter in the catalogue.

### Answer to Q51

A

## Q41i - The name of the monthly amount in `settings`

`settings.monthlyChargeAdvance` (Q10, Q41f) still uses "charge advance", which the glossary now lists under _Avoid_.

a. `settings.monthlyTenantBillAdvance`.
b. Keep `monthlyChargeAdvance`.

➡️ Recommendation: a. It follows Q41g: one name for the concept, in the setting as in the month.

### Answer to Q41i

A
