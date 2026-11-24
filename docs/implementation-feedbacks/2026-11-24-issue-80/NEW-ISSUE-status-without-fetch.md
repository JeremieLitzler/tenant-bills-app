# Draft issue (not posted): period list status without a per-file fetch

Follow-up of #80. The list on `/` loads every period file (`usePeriod` per row, `PeriodListItem.vue`) only to read `closedOn`. Plan a status that needs no per-file fetch, for example a status kept outside the period file (name or index file in the data repo).

Open points: where the status lives, how it stays in step with `closedOn` (the file stays the source of truth, ADR 0008), and what it costs the data layout.
