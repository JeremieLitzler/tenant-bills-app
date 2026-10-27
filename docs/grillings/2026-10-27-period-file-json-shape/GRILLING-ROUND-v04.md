# Grilling round v04 — period file JSON shape (issue #5)

## Settled in v03

- Q15b: a patch is `{ period, month, field: "<section>.<key>", value }`, a dot path of exactly two levels; ADR 0004 is unchanged. The queue key for a cell is `<month>|<section>.<key>`.
- Q19: the key catalogue proposed in v03 is adopted as written (`common`, `water`, `waterTreatment`, `electricity`, `softener`, `internet`, top-level `settings`).
- Q20: VAT is stored as the multiplier from the sheet (`"vat": 1.055`).

## Q21 - How a patch addresses the period settings

`settings` is outside `months`, so a settings patch has no month.

a. `month` is `null` and `field` is `"settings.<key>"`: `{ period, month: null, field: "settings.monthlyChargeAdvance", value: 70 }`. Same shape, same two-level path.
b. A separate patch kind, `{ period, setting: "monthlyChargeAdvance", value }`.

➡️ Recommendation: a. One patch shape, one queue, one apply function; the queue key becomes `null|settings.monthlyChargeAdvance`, still unique.

### Answer to Q21

A

## Q22 - What happens to the other tariff mode's indexes and prices

In Base mode, only the Base rows show (Q8 of the breakdown), but the file may still hold HC/HP keys (typed before a mode change, or inherited).

a. The formulas read only the keys of the month's `tariffMode`; the other mode's keys are kept in the file and ignored. Switching back shows them again.
b. Changing `tariffMode` also queues `null` patches removing the other mode's keys of that month.

➡️ Recommendation: a. A mode toggled by mistake then loses nothing, and the rule "a key is used only in its mode" is one line in the formulas.

### Answer to Q22

A

## Q23 - Where the starting HC/HP indexes come from on a mid-period tariff switch

Q5 allows `...Previous` keys in the first month only. If the tariff switches from Base to HC/HP in, say, January, the HC and HP registers have a previous index that no earlier month stores: December holds only `mainBase` / `studioBase`.

a. Allow the `...Previous` keys of a mode in the month where `tariffMode` differs from the previous month's, as well as in the first month.
b. Allow `...Previous` keys in any month, as an override of the previous month's current index.
c. Not supported: a tariff switch happens only at the start of a period.

➡️ Recommendation: a. The supplier change of August 2026 shows a switch can happen mid-period, and a keeps Q5 strict everywhere else. Meter replacement is a separate case, asked in Q24.

### Answer to Q23

A

## Q24 - What happens when a meter is replaced mid-period

A new water or electricity meter starts again near 0. The previous month's current index then belongs to the old meter, and the delta would be negative.

a. Allow a `...Previous` key in any month for a replaced meter (the new meter's starting index), shown only through an explicit "Compteur remplacé" action in the UI.
b. Not supported in v1: type the old meter's final index as the current index, then the new meter's index as previous in a new period.
c. Same as Q23 b: allow `...Previous` in any month without a dedicated action.

➡️ Recommendation: a. It is rare but real, and a negative delta would produce a negative share. Keeping it behind an explicit action keeps the previous-index lines read-only by default, as Q5 of the breakdown wants.

### Answer to Q24

A

## Q25 - What the app does with a file it does not understand

The file can be hand-edited in the data repo, or written by a newer app version.

a. A higher `schemaVersion` than the app knows, or an unknown section / key, or a value of the wrong type: the app shows the period read-only with the list of problems, and refuses every write to that file.
b. Ignore unknown keys and load the rest; refuse only a higher `schemaVersion`.

➡️ Recommendation: a. ADR 0004 replays patches on the remote file; writing back a file the app half-understood could silently drop what it ignored.

### Answer to Q25

A

## Q26 - What a new period file contains

"Nouvelle période" is filled by hand in v1 (Q21 of the breakdown).

a. `schemaVersion`, `period`, `settings` with both keys required (typed in the creation dialog), and `"months": {}`.
b. Same, but `settings` keys optional, filled later in the table.

➡️ Recommendation: a. The charge advance suggestion and the heat pump split need both values from the first month, and two fields in a dialog cost nothing.

### Answer to Q26

A

## Q27 - How the file is written to keep git diffs readable

Each save is a commit in the data repo, so the diff is the history of every edit.

a. Two-space indent; top-level keys in the order `schemaVersion`, `period`, `settings`, `months`; months chronological; sections and keys in the catalogue order of Q19; one trailing newline.
b. Whatever order `JSON.stringify` produces from the object.

➡️ Recommendation: a. A stable order makes each commit's diff the changed lines only, even after a 409 rebase rebuilds the object from the remote file.

### Answer to Q27

A
