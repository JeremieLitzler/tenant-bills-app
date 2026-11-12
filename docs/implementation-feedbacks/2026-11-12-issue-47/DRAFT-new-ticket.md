Title: A data repo or branch or folder or files that does not exist is not reported

Context: found while testing #47 with `netlify dev`. A well-formed but wrong `DATA_REPO` or `DATA_BRANCH` makes GitHub answer 404 on the periods folder. #44 and `docs/architecture.md` (State section) read every 404 on the list as "the folder does not exist yet", so the page says "Aucune période pour le moment." and hides the configuration problem.

What GitHub answers (Contents API, checked read-only):
- Missing branch: 404, message "No commit found for the ref <branch>".
- Missing repo: 404, message "Not Found".
- Missing folder or file: 404, message "Not Found" (same as a missing repo; a repo the token cannot see also looks the same).

Detection options (to settle in this ticket's own grilling):
a. Branch only, by the "No commit found for the ref" message. No extra call; a missing repo still reads as no period; the message text is not a documented contract.
b. Repo and branch: on a 404 of the folder listing, one extra `GET /repos/{owner}/{repo}` (200: the repo exists, so the folder or file is missing; 404: the repo is missing or not visible); the branch message tells the branch case.
c. Another approach found during the grilling.

Out of scope here: the call-to-action button on "Aucune période pour le moment." belongs to F7 (#34).
Needs: wording of the new messages (the landlord's call), and a reconciliation with #44's "absent periods folder shows an empty list".
