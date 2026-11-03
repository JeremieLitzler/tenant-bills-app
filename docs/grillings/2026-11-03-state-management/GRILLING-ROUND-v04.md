# Grilling round v04 — state management: Pinia or composables (issue #8)

## Settled in v03

- Q11: `src/composables/usePeriods.ts` exposes `usePeriods()` (collection-wide) and `usePeriod(id)` (one period: `status`, read-only `file` and `figures`, `isClosed`, `setCell`); edits only through `setCell`.
- Q12: the sync status (`pendingCount`, `syncState`) is app-wide and shown in the app shell, so the progress stays visible when moving between periods; `pendingCountFor(id)` gates "Rafraîchir".
- Q13: `useSession()` exposes `login`, `isSignedIn`, `signIn`, `signOut`, `expire`; the app shell, not `useSession`, clears the periods.
- Q14: the "signed in" hint is persisted in IndexedDB, because the PWA must open offline.
- Q15: `estimateReadings()` and `close()` belong to `usePeriod(id)` and write patches; `createPeriod()` belongs to `usePeriods()`; how it writes a new file is left to F3.

## Q16 - Does the summary match your understanding?

Read `docs/grillings/2026-11-03-state-management/GRILLING-SUMMARY.md`, including "Decided without grilling", and the new "State" section of `docs/architecture.md` and the reworded component seam in `docs/architecture-tests.md`.

➡️ Recommendation: yes, if the three files read as what you decided. Corrections go in the summary in place, and only a correction that reopens a decision starts a new round.

### Answer to Q16

YEs
