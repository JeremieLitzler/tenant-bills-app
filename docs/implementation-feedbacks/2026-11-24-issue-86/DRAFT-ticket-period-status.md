Title: A draft period becomes ongoing as soon as its second month exists

## What to build

`periodStatus` (src/domain/periodState.ts) keeps a period `draft` for as long as the previous period is not closed. The intended rule: a `draft` period becomes `ongoing` as soon as its second month exists, even if the previous period is still open (see `docs/period-file.md`, "The period status").

- Change `periodStatus` and its spec to follow the rule.
- `periodStatus` is not used by the app yet (the homepage shows "Ouverte" or "Clôturée" from `closedOn`); decide whether to show the status there in this ticket or another.
- Update `GLOSSARY.md` ("Draft period") to match.

## Acceptance criteria

- [ ] A period with one month and a previous period still open is `draft`
- [ ] A period with two months and a previous period still open is `ongoing`
- [ ] `periodStatus` and the glossary agree with `docs/period-file.md`
