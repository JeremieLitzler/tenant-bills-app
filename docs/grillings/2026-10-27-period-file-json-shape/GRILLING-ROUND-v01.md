# Grilling round v01 — period file JSON shape (issue #5)

## Settled before this session

From `docs/grillings/2026-10-26-functional-breakdown/GRILLING-SUMMARY.md` and the ADRs, the file must respect:

- ADR 0001 / Q3, Q4: inputs only; an unedited inheritable value is absent and inherits the previous month's value.
- Q30b: emptying a cell removes its override.
- ADR 0002 / Q2: twelve months, September to August.
- ADR 0004: a patch is `{ period, month, field, value }`.
- Q15: JSON keys in English.
- Q16: one file per period at `periods/YYYY-YYYY.json`.
- Q23: softener description and quantity are not inherited; unit price is.
- Q12: the charge advance stores the amount received only.

Formulas come from `ORIGINAL_SHEET_FORMULA.md` (the Google Sheets formulas, applying identically to every month). Typed values come from the `Période-092026-092027` sheet of the Excel copy. Facts used below:

- Inputs entering a formula: occupants (rows 2-3), water indexes (9-10, 12-13, 15-16), water prices (18-23), treatment prices (40-43), electricity indexes (48-59), electricity prices and taxes (66-69, 73-75), reading dates (70-71), softener quantity and unit price (81-82), internet bill (86), heat pump annual rate (154).
  - Note of Jeremie: That's correct
- Treatment lines 44-45 use rows 40, 41, 42 and 43 only: the two "Abonnement collecte" rows (38-39) enter no formula.
  - Note of Jeremie: That's correct
- Line 72, "Nombre d'unité", is `=B71-B70`: the number of days between the two reading dates.
  Note of Jeremie: That's correct if not overridden by user (which it is the case with current provider)
- `ORIGINAL_SHEET_FORMULA.md` lists the studio HC delta as `=B57-B56` and the studio HP delta as `=B59-B58`, and the internet shares read `B86`, the month's own bill. The Google Sheet therefore does not have two of the three mistakes ADR 0003 describes (those came from the Excel copy). This does not change the file shape; I flag it for a later fix of ADR 0003.
  - Note of Jeremie: I fixed it when I saw it.
- The file does not cover formulas that read the previous column (previous index = previous month's current index, `C18 = B18` inheritance, "Du" = previous "Au"); for those, the Excel copy is the only source.
  - Note of Jeremie: That's correct
- Column B (labelled 14/09/2026) has "Du" 13/09/2026 and "Au" 11/10/2026 (rows 70-71). Column C has "Au" 15/11/2026. So the "September" column's reading date falls in October.
  - Note of Jeremie: Line 1 is just to display the `month year` value.
- September has every index typed (rows 9-16, 48-59), prices, occupants 4 / 1, charge advance 70, internet 20.99, softener unit price 9.5 with quantity 0.
  - Note of Jeremie: That's correct
- October has only: charge advance 70, reading date 15/11/2026, internet `=20.99+2.49`, and water rows 19-23 retyped (row 20 changed 0.43 > 0.39, row 21 0.1 > 0.02). Its current indexes are `=C9` (equal to previous, so delta 0: not read yet).
  - Note of Jeremie: That's correct
- Some prices carry 6+ decimals (electricity subscription 0.542794, base kWh 0.118463333...).
  - Note of Jeremie: That's correct for electricity subscription. for the base kWh at `0.118463333`, I fixed it to `0.11848`.

## Q1 - What identifies a month in the file

The patch carries `month`. The "September" column is the consumption window that starts mid-September and whose reading date is in October.

a. Key `"2026-09"`: the calendar month in which the window starts (the column label).
b. Key `"2026-10"`: the calendar month of the reading date.
c. Index `0` to `11`: position in the period.

➡️ Recommendation: a. It matches the column label you already read in the sheet, is stable even when the reading date moves (11/10 vs 15/11), and stays readable in the JSON and in commit messages, unlike an index.

### Answer to Q1

if we're talking about line 1, then A. The starting date is the "month denomination".

## Q2 - How the months are laid out at the top level

a. An object keyed by month, `"months": { "2026-09": {...}, "2026-10": {...} }`, holding only months that have at least one stored value.
b. The same object, but always with the twelve keys present (empty `{}` for untouched months).
c. An array of twelve month objects.

➡️ Recommendation: a. A patch addresses `months[month][field]` directly, and a sparse object follows ADR 0001's "store nothing that was not typed". An untouched month is then simply absent, which is the same thing as an empty one.

### Answer to Q2

A

## Q3 - Flat or nested fields inside a month

a. Flat camelCase keys, one per input line: `"waterMainCurrent": 533.117`, `"waterPricePerM3": 1.05`. The patch `field` is the key itself.
b. Nested by section: `"water": { "mainMeter": { "current": 533.117 }, "prices": { "perM3": 1.05 } }`. The patch `field` is a dot path, `"water.mainMeter.current"`.

➡️ Recommendation: a. Inheritance, emptying (Q30b) and patching all work on one input line at a time; a flat map makes each of those a single key operation, with no empty parent objects to clean up when the last child is removed. Section grouping lives in the app's field catalogue, not in the file.

### Answer to Q3

Mix of A and B:

Per month, a sibbling object per section with flat keys inside:

`"2026-09": { "water": { "mainMeter": 533.117 , "pricesPerM3": 1.05  }, "internet": { "billedAmount": 19.99 }, ... }`

## Q4 - How absent, zero and empty are told apart

a. Key absent = not overridden (inherited, or empty for a non-inheritable field). A number, including `0`, = an explicit value. `null` never appears in the file. A patch with `value: null` means "remove the key" (Q30b).
b. Same, but `null` is stored to mean "explicitly empty, do not inherit".

➡️ Recommendation: a. Q30b already says emptying a cell falls back to the inherited value, so there is no "explicitly empty" state to store. Keeping `null` out of the file leaves exactly two states per key.

### Answer to Q4

A

## Q5 - Where the opening values of the first month live

The first month needs values that no previous month supplies: the previous index of every meter (Q5 of the breakdown: editable only there) and the "Du" date of the first window (13/09/2026 for 2026-2027).

a. In the first month, as extra fields (`"waterMainPrevious"`, `"previousReadingDate"`), refused by validation in any other month.
b. In a top-level `"opening"` object, outside `months`.

➡️ Recommendation: a. The patch shape `{ period, month, field, value }` then covers them with no special case, and in the table they are cells of the first column, which is where you type them.

### Answer to Q5

A

## Q6 - Whether the current index is inherited

`ORIGINAL_SHEET_FORMULA.md` does not cover this line. The Excel copy writes `C10 = C9`: an unread current index equals the previous index, so the delta is 0. If the Google Sheet does something else there, say so in your answer. Under ADR 0001 that is the same as "the current index inherits the previous month's current index".

a. Yes: the current index is an ordinary inheritable field; an unread month shows the inherited index and a delta of 0.
b. No: an unread current index is empty, and the month's water and electricity shares show "—" until it is typed.

➡️ Recommendation: a. It reproduces the sheet and keeps the monthly bill computable at any time; the "inherited" marker already tells you the meter was not read.

### Answer to Q6

A

## Q7 - Which input lines exist, and which inherit

Proposed inventory, per month. (I) = inherits, (N) = not inherited.

I1- General: reading date (N), landlord occupant count (I), tenant occupant count (I), charge advance received (N).
I2- Water consumption: main meter current index (I), studio unsoftened current index (I), studio softened current index (I), cost per m3 (I), resource withdrawal fee (I), drinking water consumption fee (I), network performance fee (I), subscription (I), VAT rate (I).
I3- Water treatment: collection consumption distributor part (I), collection consumption community part (I), collective sanitation performance (I), VAT rate (I). Indexes are shared with water consumption, not stored twice.
I4- Electricity: tariff mode (I), subscription unit (I), main base / HC / HP current indexes (I), studio base / HC / HP current indexes (I), CSPE excise rate (I), kWh base / HC / HP prices (I), subscription per unit (I), CTA amount (I), VAT rate (I).
I5- Softener: description (N), quantity (N), unit price (I).
I6- Internet: bill (I).
I7- First month only: one previous index per meter (8 meters) and the opening "Du" date.

Things I left out on purpose: the heat pump (a period setting, Q10), "Du" after the first month (= previous reading date), "Nombre d'unité" (line 72, `=B71-B70`, computed from the dates; 1 when the subscription unit is "month"), and the two "Abonnement collecte" rows (38-39), which no formula uses (lines 44-45 read rows 40-43 only).

➡️ Recommendation: yes, this inventory is complete and the (I)/(N) marks are right.

### Answer to Q7

I1- correct
I2- correct
I3- correct
I4- correct
I5- all good but `unit price` is (N)
I6- correct
I7- correct

## Q8 - Is the internet bill one number or a list of lines

October's sheet cell is `=20.99+2.49`: two items on one bill.

a. One number (23.48); the breakdown is not kept.
b. A list of `{ label, amount }` lines, summed by the app.

➡️ Recommendation: a. Only the total enters the shares, and a list would be the only non-scalar field in the month, breaking Q3's one-key-per-line patching.

### Answer to Q8

A. the two numbers reflect an increase of price.

## Q9 - Can a month hold more than one softener purchase

The sheet has one description / quantity / unit price per month.

a. One purchase per month at most.
b. Several purchases per month (a list).

➡️ Recommendation: a. It matches every month of both sheets, keeps the fields scalar (Q3), and two purchases in one month can be typed as one line with a summed quantity if they share a price.

### Answer to Q9

A. I'll input the sum .

## Q10 - What the period settings are and where they sit

a. A top-level `"settings"` object: `monthlyChargeAdvance` (the suggestion for each month's received advance) and `heatPumpAnnualAmount` (154). Not inheritable across months; one value per period.
b. The same two values, stored as fields of the first month.

➡️ Recommendation: a. They belong to the period, not to a month, and the heat pump split (Q7 of the breakdown) needs the annual amount as one number.

### Answer to Q10

A

## Q11 - How numbers and dates are written

a. Amounts, prices, rates and indexes as plain JSON numbers exactly as typed (no rounding, no cents integers); dates as `"YYYY-MM-DD"` strings; enums as lowercase strings (`"base"` / `"hchp"`, `"day"` / `"month"`).
b. Amounts as integer cents, the rest as in a.

➡️ Recommendation: a. Several inputs carry 6 decimals (0.542794), so cents would not fit them anyway; rounding happens once, in the formulas, as the sheet does with `ROUND(..., 2)`.

### Answer to Q11

A

## Q12 - What identifies the file and its version

a. Top-level `"schemaVersion": 1` (integer, bumped on any breaking change) and `"period": "2026-2027"` (repeating the file name, so a file read on its own says what it is).
b. Only `"schemaVersion": 1`; the period comes from the file name.

➡️ Recommendation: a. The duplicate costs one line and lets the app refuse a file whose content does not match its path.

### Answer to Q12

A

## Q13 - How the decision is recorded in the repo

a. An ADR for the choices that are hard to reverse (month keys, flat fields, absent vs explicit), plus `docs/period-file.md` describing every key, plus the example file `docs/examples/2026-2027.json`.
b. A JSON Schema file (`docs/period-file.schema.json`) as the reference, plus the example and an ADR.
c. Only the example file and an ADR.

➡️ Recommendation: a. No code exists yet, so the TypeScript types (F4) will be written from the doc; a JSON Schema would be a second source of truth to keep in sync with them.

### Answer to Q13

A

## Q14 - Where `ORIGINAL_SHEET_FORMULA.md` lives

It is untracked at the repo root. It is the formula reference for F4 and for the Vitest cases (Q28 of the breakdown).

a. Move it to `docs/reference/sheet-formulas.md` and commit it on this branch.
b. Commit it at the root as it is.
c. Keep it out of the repo.

➡️ Recommendation: a. It is reference material like the ADRs, and `docs/` keeps the root limited to the usual files.

### Answer to Q14

A
