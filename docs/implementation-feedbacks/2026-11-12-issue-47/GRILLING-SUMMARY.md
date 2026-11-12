# Implementation feedback summary - issue #47 (a misconfigured proxy fails closed)

## Shared understanding

Issue #47 is implemented: the proxy answers a 500 `misconfigured` when `DATA_REPO` or `DATA_BRANCH` is missing or malformed (it already did; this issue adds its handler specs), and the app shows a notice instead of the period list or the period page. The review raised eight judgment calls and your `netlify dev` test raised a ninth.

The notice keeps the app shell (header and sign-out) and replaces only the page content. Its message lives in a neutral `fr.misconfigured` entry, and the sign-in page uses the same `MisconfiguredNotice` component, so "same message" holds by construction. `index.vue` stops reading the list status and keeps its heading above the notice. In `usePeriods.ts` one `failureStatus(error)` helper replaces the two repeated ternaries, and `failFor` becomes `throwHttpError(response, action)`. The proxy keeps checking the cookie before the configuration, so an anonymous request still gets 401. The requirement that queued edits stay untouched cannot be tested before F3, so it goes to #30 as a comment, with a pointer comment in the code.

Your `netlify dev` test showed that a well-formed but nonexistent repo or branch reads as "Aucune période pour le moment.", because #44 and `docs/architecture.md` treat every 404 on the periods folder as an empty list. GitHub tells a missing branch apart ("No commit found for the ref") but answers a plain "Not Found" for a missing repo and for a missing folder or file alike. This is a gap between decisions, not a bug against #47, so it gets its own ticket, which records the three detection options and leaves the choice to its own grilling. The call-to-action button for a truly missing folder stays with F7 (#34).

## Decision index

- Q1, v01: keep the shell; the notice replaces the page content only.
- Q2, v01: add `fr.misconfigured`; the sign-in page uses `MisconfiguredNotice`.
- Q3, v01: drop the `listStatus` check from `index.vue`; the heading stays above the notice.
- Q4, v01: one `failureStatus(error)` helper in `usePeriods.ts`; the templates stay.
- Q5, v01: rename `failFor` to `throwHttpError(response, action)`.
- Q6, v01: keep the order; 401 wins over 500 for anonymous callers.
- Q7, v01: comment on #30 asking its tests to cover the misconfigured case, plus a pointer comment in `usePeriods.ts`.
- Q8, v01: you ran `netlify dev`; both variables removed show the error; criterion met.
- Q10, v03: understood that #44 and `docs/architecture.md` cause the empty-list reading.
- Q11, v03: new ticket for a repo or branch that does not exist, plus a pointer comment in `periodsApi.ts`; #47 unchanged.
- Q12, v04: the new ticket records all three detection options and leaves the choice to its own grilling.
- Q13, v04: no button in the new ticket; it belongs to F7 (#34).

## Rejected alternatives

- Q1: hide the shell and show only the notice. Not chosen; sign-out stays useful.
- Q2: keep the sign-in namespace as is, or add `fr.misconfigured` without sharing the component. Not chosen; sharing the component guarantees the same message.
- Q3: keep the check in `index.vue`, or move the heading into `PeriodList`. Not chosen.
- Q4: keep the duplication, or add an `isMisconfigured` computed. Not chosen.
- Q5: keep `failFor`. Not chosen; the name does not say it always throws.
- Q6: check the configuration first. Not chosen; revealing less to anonymous callers is safer.
- Q7: no comment, or a storage test today. Not chosen.
- Q11: fix it in #47 with an extra GitHub call, or leave it with no ticket. Not chosen; #47 is "missing or malformed" and does not own the #44 rule.
- Q12: branch only, or repo and branch by an extra call. Not chosen as the decision; both are listed in the ticket.
- Q13: a button now, or a custom button. Not chosen; nothing to open until F7.

## Decided without being asked

- In the decision index, "v0N" is the round file in which the question was asked (Q1 to Q8 in v01, Q10 and Q11 in v03, Q12 and Q13 in v04).
- The new ticket's title ("A data repo or branch or folder or files that does not exist is not reported") and its wording are mine, adjusted by you.
- The comment on #30 and the new ticket are drafted in files here and posted only after your approval.
