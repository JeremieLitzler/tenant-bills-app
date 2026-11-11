---
name: implementation-feedback
description: Turn the smells and judgment calls found by a code review into a feedback drill the user answers in files, before the pull request is opened. Use at the end of an implementation, right after `code-review` (for example at the end of `/mattpocock-skills:implement`), whenever the review reports smells, "possibly wrong" or "not asked for" findings, or any judgment call. Also use when the user says "implementation feedback", "feedback on the review", "let's go through the review findings", or resumes a folder under `docs/implementation-feedbacks/`. Do not wait to be asked: if the review has judgment calls, start the drill.
---

# Implementation feedback

A code review ends with findings that are not defects: smells (a name, a duplicated rule, a stub), things the spec did not ask for, and decisions the implementer made alone. Those are the user's to settle, and they are cheaper to settle before the pull request than in its review. This skill puts them in front of the user as a first round of questions, in a file, and then runs the same question-then-answer loop as a grilling until every point is closed.

The rounds follow the `grilling-rounds` conventions (numbered questions, lettered options, a recommendation on each, an empty answer heading). This skill replaces only its set-up and its start: the first round is written from the review, not from a grilling.

## 1. When the implementation ends

Run `code-review` as the implement flow says. Then sort its findings:

- **Defects** (a bug, a failing criterion, a documented standard broken with no judgment involved): fix them now, with a test where one fits. They are not questions. List them in the summary below as "already fixed".
- **Judgment calls**: every baseline smell, every "possibly wrong", every "not asked for", every place where you chose between options, and every user-facing string you wrote without it being specified. These become questions.

If there are no judgment calls, say so in one line and stop. Create nothing.

## 2. Write round v01

Folder: `docs/implementation-feedbacks/YYYY-MM-DD-issue-<N>/` (the issue number; the branch name if there is no issue). The date is the day the drill starts and never changes. Create it without asking. Tell the user if the folder already holds round files: resume it instead (see section 3).

File: `GRILLING-ROUND-v01.md`, in the language the user writes in (technical terms stay in English). Order:

1. `# Grilling round v01 - feedback on the code review of <issue or feature>`
2. `## Review summary`: this replaces the chat summary you would normally give at the end of an implementation. Say what was built in a few lines, what the review checked (standards, spec), what was already fixed, and the count of findings that became questions. Keep it short; the questions carry the detail.
3. `## Settled from the review`: findings that need no decision (for example a smell that tooling already enforces, or a point the user already approved). One line each. Omit when empty.
4. The questions.

Each question has this shape. Number them continuously across all rounds. One decision per question: a related decision gets the next letter (`Q3b`), never a second decision inside the same question.

```markdown
## Q<n> - <title>

<The finding in plain words, with the file and what you saw. Facts you checked yourself come first.>

a. <option>
b. <option>
c. <option>

➡️ Recommendation: <your pick and the reasoning>

### Answer to Q<n>
```

Leave the answer empty. Every question carries a recommendation, confirmations included.

Find facts yourself before asking: read the code, the docs and the ticket, and run the check if it is cheap. Do not ask the user something the repo can answer. Do ask them about anything that is theirs to decide: wording the landlord or users will read, behaviour the spec leaves open, a rule that contradicts a decision already written in the docs (name the doc and the line).

Then write one line in chat, and nothing more:

> Look at the smells and judgment calls before creating the PR: `<path>/GRILLING-ROUND-v01.md` (<N> questions). Answer under each `### Answer to Q<n>` heading, save, then tell me you answered.

Do not open the pull request, push, or comment on tickets while the drill is open.

## 3. Each time the user says they answered

Re-read every `GRILLING-ROUND-*.md` in the folder and rebuild what is settled from the user's own answers, not from your earlier recaps (a misread answer hides in a recap). Then classify each answer:

- **Blank**: point back to it ("Q4 in v01 is blank"). Do not ask it again in a new round.
- **A question** ("why do we need X?"): answer it in the next round under its own number, and re-ask the original decision under a second number with its own answer slot.
- **Conditional or contradictory** ("B if X, otherwise C", or a reversal of an earlier answer): the decision is not settled. Reopen it narrowed, say which options the answer removed, and ask it again.
- **Addresses a different decision**: split it. Fold the volunteered part into the decision it bears on, and re-ask the unanswered one verbatim under a new number.
- **Settled**: record it under "Settled in vNN-1" in the next round, restated as you understood it.

Challenge settled points that drift from the user's shared understanding, including against what the docs and tickets already say (for example an answer that removes something a ticket's acceptance criterion requires). Do it as a reopened question with the fact, not as a refusal.

Never rewrite a round file. Write the next one (`GRILLING-ROUND-v02.md`, and so on) with "Settled in vNN-1", "Reopened" when it applies, and the new questions. Chat gets one line per round: path, question count, how to resume. Keep adding rounds until nothing is open. No code or doc changes while any point is open, so the answers stay about the same code.

## 4. Closing the drill

When nothing is open, write `GRILLING-SUMMARY.md` in the folder with three parts:

1. A prose restatement of the shared understanding, including why things changed from what was built.
2. A flat decision index: one line per decision, with the question number and what was decided.
3. A flat list of rejected alternatives: one line per option that lost, with the question number and the reason.

Say in the summary anything that was decided without being asked. Ask the user, in one question, whether the summary matches their understanding. Corrections edit the summary in place unless one reopens a real decision. After a clean confirmation, delete every `GRILLING-ROUND-*.md` and keep the summary. The summary is committed with the code, because it is the only record of why.

## 5. Apply the decisions

Only now change code and docs, in this order: the agreed code changes (tests first where a seam exists), the docs that describe the behaviour (so they match the final code), then the full test suite, typecheck and lint once. Commit to the branch.

Anything that leaves the repo needs the user's go-ahead each time: comments on tickets, a push, the pull request, closing issues. Draft the comments in a file for the user to read and post them only after approval. A decision deferred to another ticket gets a comment on that ticket and a pointer comment in the code, so it is not only in a file that is later deleted.

When the user asks for the pull request, summarise the drill in its body in two lines and link the summary file.
