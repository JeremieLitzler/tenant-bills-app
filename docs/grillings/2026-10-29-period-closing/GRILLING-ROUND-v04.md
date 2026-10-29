# Grilling round v04 — when a period is closed (issue #7)

## Settled in v03

- Q7b: the lock covers `settings`. A setting added later is decided key by key.
- Q9c: the next monthly tenant bill advance is rounded **up** to the euro, `CEIL(total tenant shares / 12)`. Excel now uses `ROUNDUP`, so the golden record matches.
- Q10b: "Nouvelle période" checks the previous period only when its file exists in the data repo.
- Q13: on a closed period, nineteen keys stay editable: the seventeen pricing keys (water consumption, water treatment, electricity) plus `electricity.tariffMode` and `electricity.subscriptionUnit`. Everything else is locked.
- Q14: the communicated balance is stored, and **versioned**: each balance you communicate is kept as a history entry, with details that explain it (shape: Q18 and Q19).
- Q15: the next period keeps its stored `monthlyTenantBillAdvance` when a closed period's prices change.
- Q16: 2025-2026 is imported by a one-off script, the non-randomized mode of `extract-golden.py`. It writes the file to this repo's root, and that file is gitignored. You upload it to the data repo yourself. The details go into a follow-up issue.
- Q17: the imported 2025-2026 is closed, settled on 2026-09-12.

Your Q15 answer also brings a new rule, which I read as follows. Each time a corrected balance is communicated for a closed period, the difference from the previous communicated balance is carried into the running period's settlement. It is stored as `common.previousPeriodSettlementsDelta`. Q20 to Q22 work it out.

## Reopened

- **Q4** (`settings.closedOn`): with a history of communicated balances, closing becomes "record the first entry". `closedOn` would then repeat the first entry's date. Re-asked narrowed as Q4b.

Facts I looked up:

- ADR 0004: a drain sends every queued patch as **one** `PUT`, and ADR 0005 keeps one file per period so that a drain stays one commit with one SHA. So a patch that writes into two period files at once does not fit the queue as it stands.
- `common` is a **month** section: every key in it belongs to one month. A key named `common.previousPeriodSettlementsDelta` therefore sits in a given month of the running period.
- The settlement sign follows the sheet (`N6 > 0`): a positive balance means the landlord owes the tenant.

## Q4b - Keep `settings.closedOn`?

- a. **Drop it**: a period is closed when its history holds at least one entry. The closing date is the first entry's date.
- b. **Keep it** next to the history, as the date the lock started.

➡️ Recommendation: a. Two keys that must agree will one day disagree, for example in a hand-edited file. The history's first entry already says when and at what balance the period was closed.

### Answer to Q4b

A

## Q18 - Shape of the communicated balance history

Proposal: `settings.communicatedSettlements`, an array in date order, absent while the period is open. Each entry is:

```json
{ "date": "2026-09-12", "balance": 256.31, "note": "Régularisation initiale" }
```

- `balance`: as communicated, with the sheet's sign (positive: the landlord owes the tenant).
- The array is patched whole (`{ month: null, field: "settings.communicatedSettlements", value: [...] }`), so the patch shape doesn't change. Entries are only ever appended.
- The details that explain an entry are Q19.

Is that the shape?

➡️ Recommendation: yes. It fits the existing settings patch. Since you are the only user, replaying the whole array on a 409 is safe. Appending only means nothing in the history is rewritten.

### Answer to Q18

yes

## Q19 - The details recorded with each entry

"We'll need to record the details to explain it." What does each entry hold besides `date` and `balance`?

- a. A free-text `note` only ("Facture eau reçue : prix de mars corrigé").
- b. A snapshot of the tenant total per section at that moment, so the app can show which section moved between two entries.
- c. Both.

➡️ Recommendation: c. The per-section snapshot is what explains a difference to the tenant ("eau +4,12 €"). The note says why it changed. Both are records of what was communicated, not inputs the formulas read, so they don't go stale the way ADR 0001 fears.

### Answer to Q19

A, as suggested in Q18

## Q20 - When a new entry is recorded

- a. **Explicit action** on the closed period's settlement view: "Enregistrer la régularisation communiquée", with a required note. It is enabled when the current balance differs from the last entry.
- b. **Automatic**: every edit of a pricing key on a closed period appends an entry.

➡️ Recommendation: a. A correction often spans several prices from the same bill. One entry per communication to the tenant is what the history is for, not one per keystroke.

### Answer to Q20

A

## Q21 - Where the carried difference sits in the running period

With `common.previousPeriodSettlementsDelta` being a month key, which month holds it?

- a. The month of the running period whose window contains the entry's date. If several corrections land in the same month, they add up in that one key.
- b. Not a month key: a key in the running period's `settings`, one total for the whole period.

The running period is the open period containing today.

➡️ Recommendation: a. It mirrors when the correction was communicated, and the settlement view can show it as its own line, on the month it happened. A settings total would hide when each correction came in.

### Answer to Q21

A

## Q22 - Who writes the carried difference

Recording an entry on 2025-2026 changes its file, and the difference belongs in 2026-2027's file. Two files would mean two `PUT`s, which ADR 0004 and ADR 0005 avoid for a single drain.

- a. **The app writes both**: recording the entry queues two patches, one per period file. The drain sends one `PUT` per file, one after the other. ADR 0004 is amended to "one `PUT` per file at a time".
- b. **You type it**: the closed period's view shows the difference to carry, with a link to the running month, where you enter `previousPeriodSettlementsDelta` yourself.
- c. **Computed, not stored**: the running period's settlement reads the previous period's history and derives the carried amount. No key in the running period.

➡️ Recommendation: a. It is the only option where the two files can't drift apart by a forgotten step. The queue already carries `period` in every patch, so one `PUT` per file is a small change. c is tempting, but a correction to 2025-2026 recorded while 2027-2028 is running would have to go back two files.

### Answer to Q22

A

## Q23 - The imported 2025-2026 and the removed "Réajustement"

The 256.31 communicated on 2026-09-12 includes the sheet's -20 "Réajustement" (ADR 0002 removed it). The app's twelve-month 2025-2026 computes a different balance. If the first entry holds 256.31, the first correction you record later would carry those 20 € into the running period as if they were a correction.

- a. The import writes the **app's computed balance** as the first entry, with a note stating that 256.31 was communicated, including the -20 € adjustment for September 2026.
- b. The import writes **256.31**, and the app ignores the difference.

➡️ Recommendation: a. The history then starts from a balance the app can reproduce, so later corrections carry only real differences. The note keeps what the tenant actually saw. The follow-up import issue applies it.

### Answer to Q23

For now, A.

But let me explain the "-20".

On period 2025-2026, the `monthlyTenantBillAdvance` agreed was 50 euros.
On closing, the tenant owed 236.31 euros.
That means the new `monthlyTenantBillAdvance` is 70 euros which is +20 euros.

But she couldn't pay the full amount at once (`236.31+20=256.31`) and she didn't update her bank transfer in September 2026 to adjust the amount paid as `monthlyTenantBillAdvance`. She did in October 2026.

Also, we offered to pay the settlement in chunks over the next months. That's out of scope for now but it'd be good to support this in the future.
