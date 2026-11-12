Comment to post on #30 (F3):

From #47: when the data proxy is misconfigured (500 `misconfigured`), the app shows a full-page notice and must leave the edit queue and local storage untouched. #47 could not test it because the queue does not exist yet. Please add a test in F3 that a misconfigured load (list or period) neither clears nor changes queued edits. A pointer comment sits in `usePeriods.ts` (`loadPeriodIds`).
