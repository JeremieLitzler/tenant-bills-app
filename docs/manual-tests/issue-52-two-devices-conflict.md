# Manual test: two devices, conflict rebase on 409 (#52)

1. On device A and device B, sign in and open the same period.
2. Put device B offline (browser dev tools, Network, Offline).
3. On device B, type a value in a cell X and another in a cell Y. The pending count shows 2.
4. On device A, change cell X to a different value. Wait for the sync status to show idle.
5. Put device B back online. The queue drains.
6. Check the data repo: the file holds A's other edits, B's value for X (the queued value wins) and B's value for Y. Exactly one commit came from B, with the message `data(<period>): 2 edits in <month>`.
7. Force a second 409 on device B: go offline, type one edit (the pending count shows 1), then paste this in the console, which makes every write answer 409:
   `const f = window.fetch; window.fetch = (u, i) => i?.method === 'PUT' ? Promise.resolve(new Response('{}', { status: 409 })) : f(u, i)`
   Go back online. The pending count stays at 1, the sync status shows the error, and the data repo has no new commit. Reload the page: the drain runs without the override and the edit is saved.
8. Close a period on device A. On device B (offline, queued edit typed before the close), go online: the edit is applied and the period is flagged as edited after the close (`editedClosedPeriods`; the UI flag is not shown yet).
