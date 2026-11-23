# Manual test: two devices, conflict rebase on 409 (#52)

1. On device A and device B, sign in and open the same period.
2. Put device B offline (browser dev tools, Network, Offline).
3. On device B, type a value in a cell X and another in a cell Y. The pending count shows 2.
4. On device A, change cell X to a different value. Wait for the sync status to show idle.
5. Put device B back online. The queue drains.
6. Check the data repo: the file holds A's other edits, B's value for X (the queued value wins) and B's value for Y. Exactly one commit came from B, with the message `data(<period>): 2 edits in <month>`.
7. Force a second 409 on device B:
   1. Put B offline and type one edit (the pending count shows 1).
   2. In the console, paste this. It makes every write answer 409:
      `const f = window.fetch; window.fetch = (u, i) => i?.method === 'PUT' ? Promise.resolve(new Response('{}', { status: 409 })) : f(u, i)`
   3. Put B back online. The drain gets a 409, fetches again, retries and gets a second 409.
   4. Expected: the pending count stays at 1, the sync status shows the error, an error toast appears and the data repo has no new commit.
   5. Reload the page to remove the override. The drain then runs and the edit is saved normally.
8. Close a period on device A. On device B (offline, queued edit typed before the close), go online: the edit is applied and the edited cell is flagged in the period table (`data-edited-after-close`).
