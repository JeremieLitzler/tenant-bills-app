# Grilling round v02 — period file JSON shape (issue #5)

## Settled in v01

- Q1: a month is keyed by the calendar month of its column label (line 1, "Parts"), the month in which its window starts: `"2026-09"` for the column labelled 14/09/2026. Added to `GLOSSARY.md` under **Month**.
- Q2: `"months"` is an object keyed by month, holding only months with at least one stored value.
- Q3: neither a nor b as asked. Inside a month, one object per section, flat keys inside it: `"2026-09": { "water": { "mainMeter": 533.117, ... }, "internet": { ... } }`. The follow-ups are Q15 to Q18 below.
- Q4: absent key = not overridden; any number including `0` = explicit; `null` never stored; a patch with `value: null` removes the key.
- Q5: the opening values (previous indexes, opening "Du") are extra fields of the first month, refused in any other month.
- Q6: the current index is an ordinary inheritable field; an unread month shows the inherited index and a delta of 0.
- Q7: the inventory is complete, with one change: the softener unit price is not inherited (N). See Q7b.
- Q8: the internet bill is one number. The October value 23.48 is a price increase, so it is inherited by the following months.
- Q9: one softener purchase per month at most; two purchases are typed as their sum.
- Q10: a top-level `"settings"` object holds `monthlyChargeAdvance` and `heatPumpAnnualAmount`, one value each per period.
- Q11: plain JSON numbers as typed, dates as `"YYYY-MM-DD"`, enums as lowercase strings.
- Q12: top-level `"schemaVersion": 1` and `"period": "2026-2027"`; the app refuses a file whose `period` does not match its path.
- Q13: an ADR, `docs/period-file.md` describing every key, and the example `docs/examples/2026-2027.json`.
- Q14: `ORIGINAL_SHEET_FORMULA.md` moves to `docs/reference/sheet-formulas.md`, committed on this branch (done at the end of the session, with the other files).

## Reopened

- Q23 of the functional breakdown said the softener unit price is inherited. Your Q7 answer says it is not. Q7b confirms which one holds.

## Q7b - Is the softener unit price not inherited, unlike Q23 of the breakdown

The Excel copy agrees with your Q7 answer: the unit price is 9.5 in September, 0 in October and November, 9.5 again in December, so it is typed only on the months with a purchase. If it holds, every softener field (description, quantity, unit price) is non-inherited, and I correct Q23 in `docs/grillings/2026-10-26-functional-breakdown/GRILLING-SUMMARY.md`.

a. Not inherited: a month without a purchase has no softener field at all.
b. Inherited, as Q23 said.

➡️ Recommendation: a. A month with no purchase then stores nothing for the softener, and an empty quantity already gives a share of 0.

### Answer to Q7b

A

## Q15 - What the patch `field` looks like

With section objects, a patch must name both the section and the key.

a. A dot path of exactly two levels, `"water.mainMeter"`: `{ period: "2026-2027", month: "2026-09", field: "water.mainMeter", value: 533.117 }`.
b. Two separate properties, `{ period, month, section: "water", field: "mainMeter", value }`, changing the ADR 0004 shape.

➡️ Recommendation: a. ADR 0004's shape stays as written, and a fixed depth of two means no general path walker: split on the one dot.

### Answer to Q15

I need a few options through `/prototype` to decide

## Q16 - Which section objects a month holds

Your example names `water` and `internet`. Some inputs belong to no section: the reading date, the two occupant counts and the charge advance received.

a. `general` (reading date, occupant counts, charge advance received), `water` (all three water meters and the water consumption prices), `waterTreatment` (its prices only; it reads the indexes from `water`), `electricity`, `softener`, `internet`. The heat pump has no month inputs, so no object.
b. Same sections, but the four general inputs sit directly in the month object, next to the sections.

➡️ Recommendation: a. Every key in a month is then at the same depth, so Q15's two-level path holds without exception.

### Answer to Q16

A, but name it `common`.

## Q17 - What happens to an object left empty

When the last key of a section is removed (Q4: patch with `value: null`), the section object is empty; when the last section goes, the month is empty.

a. Remove the empty section, then the empty month, so the file never holds `{}`.
b. Keep empty objects.

➡️ Recommendation: a. It follows Q2 (only months with stored values exist) and keeps one representation per state; the file stays identical to one where the value was never typed.

### Answer to Q17

A

## Q18 - How a meter's current and previous index are named

Your example writes the main water meter's current index as `"mainMeter": 533.117`. The first month also stores the previous index of the same meter (Q5).

a. The meter name holds the current index, and `<meter>Previous` holds the previous one: `"mainMeter": 533.117`, `"mainMeterPrevious": 525.69`.
b. Both suffixed: `"mainMeterCurrent"`, `"mainMeterPrevious"`.

➡️ Recommendation: a. It keeps your example as written, and the current index is the key you type every month; the `Previous` suffix marks the rare first-month-only key.

### Answer to Q18

A
