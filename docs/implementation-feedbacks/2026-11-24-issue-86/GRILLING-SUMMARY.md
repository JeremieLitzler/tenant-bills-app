# Grilling summary - feedback on the code review of issue #86

The review of the settlement work (`settlementState`, the settlement page and the October banner) found no defect, only judgment calls. They were settled as follows. The October banner keeps its box, because the read-only notice on the same page already has that form, and the design system gets a line for it. `read` requires the reading date on a non-estimated twelfth month, as ADR 0006 says. The three French texts stay as written. The title label moves into a `computed`, which removes the two `!` assertions; the name `read` stays. `settlementState` stays a separate function from `periodStatus`: the two machines answer different questions and only share `closedOn`, so issue #86's body is rewritten to say so.

The diagram requested in round v01 showed one thing nobody had said: `periodStatus` is not used by the app yet (the homepage shows "Ouverte" or "Clôturée" from `closedOn` alone). It also surfaced a rule that differs from the code and from `docs/period-file.md`: a `draft` period becomes `ongoing` as soon as its second month exists, not when the previous period closes. That rule is intended, but changing `periodStatus` is out of scope for #86, so it goes to a separate ticket and the doc is updated to state the rule.

## Decisions

- Q1, v01: keep the banner box and add an "information banner" line to `docs/design-system.md`.
- Q2, v01: `read` requires `common.endDate` on a non-estimated twelfth month.
- Q3, v01: keep the French texts of the final title and the estimated title. Corrected after the drill: the banner is the "twelfth month banner" and says the final settlement comes about a month after the last reading, instead of naming October (a period can start in any month).
- Q4 and Q7, v01 and v02: keep `settlementState` separate from `periodStatus`; rewrite the body of issue #86.
- Q5, v01: extract the title label into a `computed`, keep the name `read`.
- Q6, v02: the diagram of `settlementState` is accurate; the diagram of `periodStatus` must not show `draft` to `closed`.
- Q8 and Q10, v03 and v04: `draft` ends as soon as the second month exists; document the rule in `docs/period-file.md`, open a separate ticket for `periodStatus` and its spec, leave #86 unchanged otherwise.
- Q9, v04: information only, `periodStatus` is not used by the app yet.

## Rejected alternatives

- Q1: restyle the banner as the documented small warning, without a box.
- Q2: let a non-estimated twelfth month with indexes but no date count as `read`.
- Q4 and Q7: add a fifth value to `periodStatus` (it would need the cross product of both machines).
- Banner correction: keep the name "October banner" and the fixed "en octobre" text; compute the month name from the twelfth month's date.
- Q5: do nothing; rename `read` to `awaitingWaterBills`.
- Q8 and Q10: keep `draft` until the previous period closes (the current code and doc).

## Decided without being asked

- The diagram goes into `docs/period-file.md`, next to "The period status", showing the intended `draft` rule. You did not say whether the diagram should live in the repo.
  - Approved
- The separate ticket for `periodStatus` is created only after your go-ahead, with a draft in this folder first.
  - Approved creation
- The rewrite of issue #86's body is drafted in this folder and posted only after your go-ahead.
  - Approved
