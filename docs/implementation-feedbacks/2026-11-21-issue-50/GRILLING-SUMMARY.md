# Implementation feedback summary - issue #50 (sync badge, status and load-time SHA check)

## Shared understanding

Issue #50 added a badge in the app shell (count of queued edits and the sync status) and a quiet remote SHA check when a page opens a period already held. The code review found no defect that needed a question; ten smells and judgment calls were settled over three rounds. Most of the implementation stays as built: the check stays opt-in on the two period pages, the guards around the toasts stay inline, the `error` status clears with the next successful drain, and `usePeriods()` stays the single facade for `pendingCount` and `syncState`.

What changes: the strings and the badge. The count agrees in number and is shown at zero ("Aucune modification en attente"), because the issue says the badge "goes back to zero" and a hidden count would not show it. The badge becomes its own component, placed in `main` just before the slot rather than in `header`, for the mobile view. The online and offline connectivity moves out of `useSaveQueue.ts` into a small `useOnline` composable shared with `App.vue`. The `quiet` flag of `refreshPeriod` is renamed `silentUnlessUpdated`, because it says what the flag does: no message unless the file was replaced.

## Decision index

- Q2, v01: SHA check stays opt-in (`{ checkRemote: true }`) on the two pages.
- Q3, v01: the three `if (!flag) notify(...)` guards stay, no helper.
- Q5, v01: states keep their wording; the count agrees in number (none, 1, N).
- Q6, v01: `fr.shell.pending` becomes a function of the count.
- Q8, v01: connectivity moves into `useOnline`, used by the sync status and by `App.vue`.
- Q9, v01: `error` clears with the next successful drain.
- Q10, v01: facade stays, `pendingCount` and `syncState` on `usePeriods()`.
- Q11, v02: the explanation of Q1 was clear.
- Q12, v02: keep two facts, rename `quiet`.
- Q13, v02: the explanation of the three outcomes was clear.
- Q14, v02: the "mise à jour" toast stays on a pulled change; "up to date" and "failed" stay silent on opening.
- Q15, v02: the badge shows "Aucune modification en attente" at zero; the badge moves into its own component, in `main` before the slot.
- Q16, v03: `quiet` is renamed `silentUnlessUpdated`.

## Rejected alternatives

- Q1/Q12: rename to one word end to end (`onOpen`), or split `checkPeriodOnOpen` out of `refreshPeriod`; no reason given.
- Q2: make the check the default, or move it to a router `beforeEnter`; no reason given.
- Q3: a local `tell()` helper; no reason given.
- Q4/Q14: silence the "mise à jour" toast; no reason given.
- Q5: keep "{count} modification(s)"; the count must agree in number.
- Q7/Q15: hide the count at zero, or hide it with an accessible zero label; the issue says the badge goes back to zero.
- Q8: keep the listeners in `useSaveQueue.ts`; connectivity gets its own composable.
- Q9: clear `error` when the landlord edits again, or show `idle` while the queue is empty; no reason given.
- Q10: group the total and the status under one `sync` object; no reason given.
- Q16: `tellOnlyUpdates`, `quietUnlessChanged`; no reason given.

## Decided without being asked

- The badge component is placed in `main` just before the slot, and it is built as its own file (from the Q15 answer, not a separate question).
  - Approved
- The existing tests for the badge and the sync state (AppShell.spec.ts, useSaveQueue.spec.ts) are updated to the new strings and to `useOnline`.
  - Approved
- `docs/architecture.md` is updated for `useOnline` and for the badge component.
  - Approved
