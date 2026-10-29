# Grilling round v02 — when a period is closed (issue #7)

## Settled in v01

- Q1: a period is closed by an explicit "Clôturer la période" action that stores a marker in the period file. Until then the settlement is "provisoire", even when every month is complete.
- Q2: a closed period is locked: every cell is read-only, and changing anything requires reopening it first (whether reopening exists: Q5).
- Q3: "Nouvelle période" is refused until the previous period is closed. Your reason: closing gives the final settlement, so the new period's monthly tenant bill advance is known when it is created. It is the previous period's tenant shares averaged over twelve months, rounded up to the euro (69.69 > 70).

Glossary: I added **Closed period** (_Période clôturée_) and **Provisional settlement** (_Régularisation provisoire_) to `GLOSSARY.md`.

Facts I looked up:

- In the spreadsheet, `Régularisation-20252026!N15` ("Nouvelle annualisation") is `=-SUM(N5:N10)/12`, and its cached value is `69.6925`. The sheet does not round it, so the "rounded up to the euro" rule is yours, not the sheet's.
- Test scope grilling: the formula tests expect the fixed sheet's cached values, with no exceptions. A rounded-up advance would not match `N15` as it stands.
- Patches (ADR 0004) are `{ period, month, field, value }`. A settings patch is `{ month: null, field: "settings.<key>" }`, and `value: null` removes the key.

## Q4 - The closing marker in the period file

Where the marker goes, and what it holds:

- a. `settings.closedOn: "YYYY-MM-DD"`, the date "Clôturer la période" was pressed, absent while the period is open. It goes through the patch queue as an ordinary settings patch (`{ month: null, field: "settings.closedOn" }`), so closing works offline and needs no new patch kind.
- b. A top-level `closedOn` next to `settings`. This keeps `settings` for values the formulas read, but the patch shape needs a new kind of `field` with no `settings.` or section prefix.
- c. A top-level `status: "open" | "closed"`. The same patch cost as b, and it does not record when the period was closed.

In every option the key is optional, so `schemaVersion` stays `1`. No app has shipped yet, so no older reader can miss it and leave a closed period editable.

➡️ Recommendation: a. It reuses the patch shape as it is. The date lets the period list and the settlement view show "Clôturée le 18/09/2027". Its home in `settings` fits, because like the other settings it is set once for the whole period.

### Answer to Q4

A

## Q5 - Reopening a closed period

Can a closed period be reopened?

- a. **Yes**: a "Rouvrir la période" action, behind a confirmation ("La régularisation communiquée au locataire pourra changer"), removes the marker. The period becomes open again, editable and "provisoire".
- b. **No**: closing is final. A mistake found later can only be fixed by editing the JSON in the data repo by hand.

➡️ Recommendation: a. With Q2's lock, a typo in a closed period would otherwise need a hand edit on GitHub. The confirmation keeps it deliberate.

### Answer to Q5

B with a twist: only the pricing of water consumption, treatment and electricity tariff can be updated. For example, this month, I receive the water bills and it showed that the `waterConsumption.pricePerM3` and `waterConsumption.subscription` where updated in March 2025.

## Q6 - When "Clôturer la période" is allowed

- a. **Only when complete**: every month has a `readingDate`, and every tenant share of every month can be computed (no "—" anywhere). Otherwise the button is disabled, with the list of what is missing. Months whose `tenantBillAdvance` is `0` don't block it, but the confirmation lists them ("Aucune avance reçue en : …"), since `0` can be a true "nothing received".
- b. **Any time**: closing is your call alone, even with gaps; the settlement is computed with whatever is there.

➡️ Recommendation: a. A settlement you hand to the tenant with a missing month is wrong by construction, and the app can see it. The `0` advances are a warning, not a block, because the file cannot tell "not paid" from "not typed yet".

### Answer to Q6

A

## Q7 - What the lock covers

Q2 locks every cell. Does the lock also cover the period's `settings` (today only `monthlyTenantBillAdvance`)?

- a. **Yes**: everything in the file is read-only except "Rouvrir la période".
- b. **No**: settings stay editable on a closed period.

➡️ Recommendation: a. `monthlyTenantBillAdvance` doesn't change the settlement, but it is still part of the period. One rule ("closed means read-only") is easier to trust than an exception.

### Answer to Q7

See answer to Q5

## Q8 - Edits queued before the close reaches the file

The lock is a UI rule: once the app sees `closedOn`, it shows the period read-only. But a patch can already be in the queue when the close lands in the file. For example, you edit a price on the phone offline, then close the period from the computer. Later, the phone drains its queue and rebases on 409 (ADR 0004, where the queued edit wins). Should that patch:

- a. **Apply as usual**: it was a legitimate edit, made while the period was open. The app flags it afterwards ("Une modification a été enregistrée sur une période clôturée"), so you can decide whether to reopen.
- b. **Be dropped**: the apply step refuses any patch other than `settings.closedOn` on a closed period, and the app tells you which edit was dropped.

➡️ Recommendation: a. You are the only user, so this race needs two of your own devices, one of them offline. Silently losing an edit is worse than a flagged one. It also keeps the apply function free of a special case.

### Answer to Q8

A

## Q9 - Rounding of the next monthly tenant bill advance

The settlement view shows "Nouvelle annualisation", the next monthly tenant bill advance. Following Q3:

- a. **Rounded up to the euro**: `CEIL(total tenant shares / 12)`, so 69.6925 shows as 70. Is this the only figure shown?
- b. **Both**: the exact average (69.69) and the rounded-up advance (70).

➡️ Recommendation: a, with the exact average as small print under it ("moyenne : 69,69 €"). The rounded-up figure is the one you use, and the small print explains where it comes from.

### Answer to Q9

I like B

## Q9b - The golden record and the rounded-up advance

The formula tests expect the fixed sheet's cached values with no exceptions, but `N15` holds `69.6925`, not `70`. Should the sheet be fixed, by changing `N15` to `=ROUNDUP(-SUM(N5:N10)/12, 0)` and regenerating the cached values, so the test fixture expects `70`?

➡️ Recommendation: yes. It keeps the "no exceptions" rule from the test-scope grilling. The alternative is a test that checks against the sheet's value and then rounds, which is a hidden exception.

### Answer to Q9b

The formula is `=round(-SUM(N5:N10)/12;)`
Excel updated.

## Q10 - The first period has no previous one

The spreadsheet's history is not imported (functional breakdown Q22), so the first period created in the app (2026-2027) has no previous period to be closed. Should "Nouvelle période" check the previous period only when that period exists in the data repo, and allow the first one freely?

➡️ Recommendation: yes. The check looks up `periods/<previous>.json`. If it's missing, there is nothing to wait for. If it's there and not closed, creation is refused, with a link to its settlement.

### Answer to Q10

We need a import or convert feature. I'll need a script to generate the JSON for period 2025/2026 so I can upload the file on the data repo.

## Q11 - The gap between the August reading and the close

With Q3, the new period does not exist between the August reading (mid-September) and the moment you close the old period. During that gap, there is nowhere to type the tenant's September transfer for the new period. Do you accept this gap, and close the old period before recording anything for the new one?

➡️ Recommendation: yes. The August reading is the last input of the old period. Closing can follow within days, and the September transfer can wait until then.

### Answer to Q11

yes

## Q12 - Prefilling the new period's advance in v1

Functional breakdown Q21 left all prefill of "Nouvelle période" to v2. Q3 makes the previous period's next monthly tenant bill advance final and available at creation. Should v1's "Nouvelle période" prefill `monthlyTenantBillAdvance` with it, still editable, while every other value stays typed by hand?

➡️ Recommendation: yes. It is one value, read from a closed period that Q3 guarantees exists. It is also the number you closed the period to get. The rest of the prefill stays v2.

### Answer to Q12

yes
