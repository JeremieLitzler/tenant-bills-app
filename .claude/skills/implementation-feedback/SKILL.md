---
name: implementation-feedback
description: Turn the smells and judgment calls found by a code review into a feedback drill the user answers in files, before the pull request is opened. Use at the end of an implementation, right after `code-review` (for example at the end of `/mattpocock-skills:implement`), whenever the review reports smells, "possibly wrong" or "not asked for" findings, or any judgment call. Also use when the user says "implementation feedback", "feedback on the review", "let's go through the review findings", or resumes a folder under `docs/implementation-feedbacks/`. Do not wait to be asked: if the review has judgment calls, start the drill.
---

# Implementation feedback

A code review can end with findings that could be defects: smells (a name, a duplicated rule, a stub), things the spec did not ask for, and decisions the implementer made alone. Those are the user's to settle, and they are cheaper to settle when implementation ends. This skill puts them in front of the user as a first round of questions, in a file, and then runs the same question-then-answer loop as a grilling until every point is closed.

The rounds follow the `grilling-rounds` conventions (numbered questions, lettered options, a recommendation on each, an empty answer heading). This skill replaces only its set-up and its start: the first round is written from the review, not from a grilling.

## 1. When the implementation ends

Run `code-review` as the implement flow says. Then sort its findings:

- **Defects** (a bug, a failing criterion, a documented standard broken with no judgment involved): fix them now, with a test where one fits. They are not questions. List them in the summary below as "already fixed".
- **Judgment calls**: every baseline smell, every "possibly wrong", every "not asked for", every place where you chose between options, and every user-facing string you wrote without it being specified. These become questions.

If there are no judgment calls, say so in one line and stop. Create nothing.

## 2. Write round v01

Folder: `docs/implementation-feedbacks/YYYY-MM-DD-issue-<N>/` (the issue number; the branch name if there is no issue). The date is the day the drill starts and never changes. Create it without asking. Tell the user if the folder already holds round files: resume it instead (section 3).

File: `GRILLING-ROUND-v01.md`, in the language the user writes in (technical terms stay in English). Order:

1. `# Grilling round v01 - feedback on the code review of <issue or feature>`
2. `## Review summary`: this replaces the chat summary you would normally give at the end of an implementation. Say what was built in a few lines, what the review checked (standards, spec), what was already fixed, and the count of findings that became questions. Keep it short; the questions carry the detail.
3. `## Settled from the review`: findings that need no decision (for example a smell that tooling already enforces, or a point the user already approved). One line each. Omit when empty.
4. The questions.

Write the questions exactly as the `grilling-rounds` skill describes (its "Writing a round" section): continuous numbering, one decision per question, lettered options, a `➡️ Recommendation:` on every question, an empty `### Answer to Q<n>`. Do not restate that format here or in the files.

Find facts yourself before asking: read the code, the docs and the ticket, and run the check if it is cheap. Do not ask the user something the repo can answer. Do ask them about anything that is theirs to decide: wording the landlord or users will read, behaviour the spec leaves open, a rule that contradicts a decision already written in the docs (name the doc and the line).

Then write one line in chat, and nothing more:

> Look at the smells and judgment calls before creating the PR: `<path>/GRILLING-ROUND-v01.md` (<N> questions). Answer under each `### Answer to Q<n>` heading, save, then tell me you answered.

Do not open the pull request, push, or comment on tickets while the drill is open.

## 3. The loop and the closing

From here the drill is a grilling session whose first round already exists. Follow the `grilling-rounds` skill for everything after round v01: its "When the user says they answered" section (re-read all round files, classify each answer, write the next round, never rewrite a round file) and its "Ending" section (`GRILLING-SUMMARY.md` with the prose restatement, the flat decision index and the flat rejected alternatives; one confirmation question; delete the round files after a clean confirmation). Its set-up section does not apply: the folder is fixed in section 2.

What this skill adds on top:

- **Challenge drift.** When a settled answer drifts from what the docs or the ticket already say (for example an answer that removes something a ticket's acceptance criterion requires), reopen it as a narrowed question that quotes the fact. Do not refuse and do not silently accept.
- **Nothing changes while the drill is open.** No code, doc, ticket or PR change until every point is closed, so all the answers are about the same code.
- **The summary stays in the repo.** Commit `GRILLING-SUMMARY.md` with the code: it is the only record of why.
- **Say what was decided without being asked** in the summary, so the user can object.

## 4. Apply the decisions

Only now change code and docs, in this order: the agreed code changes (tests first where a seam exists), the docs that describe the behaviour (so they match the final code), then the full test suite, typecheck and lint once. Commit to the branch.

Anything that leaves the repo needs the user's go-ahead each time: comments on tickets, a push, the pull request, closing issues. Draft the comments in a file (same folder as the summary) for the user to read and post them only after approval. A decision deferred to another ticket gets a comment on that ticket and a pointer comment in the code, so it is not only in a file that is later deleted.

When the user asks for the pull request, summarise the drill in its body in two lines and link the summary file.
