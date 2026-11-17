# Impact 4 - sync layer, patches and commit messages

## Impact

- `src/sync/periodsApi.ts` and `src/composables/usePeriods.ts` never read `settings`, so they barely change. The patch apply function of issue #48 (not built) must accept a whole-month value (`field: "month"`, ADR 0010) and top-level patches (`month: null`, `field: "closedOn"`), instead of `settings.<key>`.
- `docs/architecture.md` "Data commits" still names the group of top-level patches `settings`.
- The commit message of a month initialization is not decided. It is one patch, so the subject `<n> edits in <where>` would count it as one edit and hide what happened.

## Judgment calls to review

- Whether a month initialization gets its own subject, for example `data(<period>): initialize <YYYY-MM>`. I recommend it; it needs a short grilling because it changes the subject shapes of #53.
  - Approved your recommendation
- Whether the period creation commit stays `data(<period>): create period` with the first month inside it.
  - Yes, it does

## Path to done

1. Decide the subject (one short round).
2. Update `docs/architecture.md` "Data commits".
3. Implement the apply function with both patch kinds when #48 is built. The queue, the drain and the 409 rebase do not change.

> Approved

## Needed from you

Nothing: approved. I will write the commit subject `data(<period>): initialize <YYYY-MM>` into `docs/architecture.md` "Data commits" in the commit for this scope.
