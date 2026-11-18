# Drafts to post after approval (nothing here is posted yet)

## Comment on #50 (Sync badge, status and load-time SHA check)

From #48 (`docs/implementation-feedbacks/2026-11-18-issue-48/GRILLING-SUMMARY.md`): `useSaveQueue()` (`src/composables/useSaveQueue.ts`) now exposes `lastError`, the error of the last failed drain, cleared by the next successful drain. It is also written with `console.error`. It was added so the "error banner after a failed drain" has data to read; replace it with `syncState` if that is cleaner. A drain failing on one period no longer stops the others (the failing period keeps its patches), and a 401 ends the session. Pending counts are set by `useSaveQueue.ts` through `pendingPatches.ts`.

## Comment on #120 (Grill the global toast notifications)

From #48: a failed save is only visible in the console today. `useSaveQueue().lastError` (`src/composables/useSaveQueue.ts`) holds the error of the last failed drain, so "sync failures" in the list of messages to migrate can read it. A pointer comment in that file names this issue and #50.

## Comment on #53 (Multi-group drains and their commit messages)

From #48: `commitMessage()` (`src/domain/commitMessage.ts`) already builds all the subject shapes of "Data commits" (single month, `settings`, several months, months and settings, and the `initialize <YYYY-MM>` subject) with the body for more than one group, and `commitMessage.spec.ts` covers the shapes. `drainQueue()` already writes one commit per period file, and a period that fails no longer blocks the others. What is left for #53: the specs that removals are counted and that patches for two periods give two `PUT`s with one commit each (the second one is partly covered by `drainQueue.spec.ts`, "drains the other periods when one fails").

## New issue: Grill again whether state is held in singleton composables or Pinia

Title: `Grill the state management choice again: composables or Pinia`

Body:

- Reopen the decision of #8 (`docs/grillings/2026-11-03-state-management/GRILLING-SUMMARY.md`, Q1: singleton composables, no Pinia) with the state as it is after F3: the loaded periods (`usePeriods.ts`), the save queue (`useSaveQueue.ts`, added by #48), the session (`useSession.ts`), `lastError`, and the sync status of #50.
- Starting facts: #8 chose composables because the state was small, with one user and no SSR, and recorded that moving to Pinia later is cheap because a setup store's body is the composable's body. It also noted that Pinia would mainly bring devtools. #48 split the queue out of `usePeriods.ts` (`docs/implementation-feedbacks/2026-11-18-issue-48/`), which is the kind of change that could tip the balance.
- Open points: what Pinia would bring now (devtools, a store per concern, testing helpers), what it would cost (the Vue-free `src/sync/` stays as it is; the composables would become stores), whether the singleton composables are still the simplest shape.
- Output: a `GRILLING-SUMMARY.md` under `docs/grillings/`, and, only if the decision changes, an implementation issue.
