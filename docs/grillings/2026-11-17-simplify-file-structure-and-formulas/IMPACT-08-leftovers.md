# Impact 8 - leftovers in the repo

## Impact

- `docs/scenarios-unsaved-delta.md`: your pre-Mermaid copy of the scenarios. It duplicates `docs/scenarios.md` and has the `commun` typo; delete it once you accept the comparison.
- `docs/grillings/2026-10-27-period-file-json-shape/PROTOTYPE-patch-field.html` still shows the v1 patch field; it is a throwaway prototype and was kept.
- `docs/implementation-feedbacks/*` and the root `README.md` were not read for stale rules.
- Older grilling summaries still name ADRs 0001 to 0006 as history. Their banners say what the 2026-11-17 grilling replaced; agents are told to skip obsolete ADRs (`docs/agents/domain.md`).
- No link check was run on the rewritten docs.

## Path to done

1. You delete `docs/scenarios-unsaved-delta.md`, or ask me to.
   1. Done
2. A `rg` pass for `settings`, `readingDate`, `resolveValue` and "inherited" over `docs/` and `README.md`.
   1. What is a `rg` pass?
   2. `rg` is ripgrep, a fast text search. I ran it over `docs/`, `README.md`, `GLOSSARY.md` and `AGENTS.md` for `settings`, `readingDate`, `resolveValue`, "inherit" and the old September-to-August wording, excluding history (past grillings, obsolete ADRs, `docs/reference`). It found only intended mentions (ADR 0007 rejecting inheritance, the glossary's "Avoid: Reading date", ADR 0009's description of the old 13 columns). `docs/implementation-feedbacks/2026-11-11-issue-55/GRILLING-SUMMARY.md` mentions the old terms: it is history of a undone implementation, left alone.
3. Commit the branch `docs/106-simplify-file-structure` once you have reviewed impacts 1 to 8.
   1. OK, make atomic commits grouping updates per scope.

## Needed from you

Nothing. I make the atomic commits next.
