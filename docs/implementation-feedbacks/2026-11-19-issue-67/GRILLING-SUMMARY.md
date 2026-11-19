# Summary - feedback on the code review of issue 67 (warnings in the period table)

## Shared understanding

Issue 67 highlights implausible values in the period table without blocking them: a decreasing index and an end date before the start date, computed by the domain module (`monthWarnings`) and only displayed by the table. The review found no defect. It raised four judgment calls.

The French texts and the plain `current < previous` rule stay as written. The red `destructive` token stays. What changes is how the explanation reaches the user: a native `title` is not reachable on a phone or with the keyboard, so a warned cell shows a small bubble under it with the message whenever the cell is selected (click, tap or arrow keys). The "⚠️" stays in the cell as a plain marker, not a button. A throwaway prototype (branch `prototype/67-warning-bubble`, `?warn=select`) was tried against the button variant and the message-line variant, and this one was picked. A warned cell also gets a red ring on top of the existing red tint and text, always visible, and the ring stays visible when the cell is selected.

## Decision index

- Q1, v01: keep both French warning texts as written.
- Q2, v01: the explanation must be visible, not only a `title`, and the cell gets a red ring. The trigger was refined by Q5.
- Q3, v01: keep the red `destructive` token.
- Q4, v01: keep the plain `current < previous` rule, no follow-up ticket for a replaced meter.
- Q5, v02: a bubble anchored under the cell (not a line under the table), shown when the cell is selected. First answered as "opened by clicking a ⚠️", then changed to "shown on selection" after the prototype. The user will confirm once implemented whether the bubble covering the cell below is a problem.
- Q6, v02: ring added to the tint and red text, always visible, and it stays visible on a selected warned cell.

## Rejected alternatives

- Q2: option a (`title` only), because it does not work on a phone or with the keyboard. Option b (`aria-description`), because the user wants a visible explanation.
- Q3: option b (amber warning tone), not chosen.
- Q4: option b (follow-up ticket for a "meter replaced" dismissal), not chosen.
- Q5: option a (line outside the scroll area), because the user prefers the bubble. The "⚠️" button that opens the bubble, because on selection is simpler and needs no extra tap.
- Q6: option b (ring replaces the tint), not chosen.

## Decided without being asked

- The bubble disappears when the selection moves, and is announced to screen readers with `role="status"`. The `title` attribute is dropped, the bubble replaces it.
  - Approved
- Only one bubble can show at a time, since only one cell is selected.
  - Approved
- The bubble is rendered so the scroll container and the sticky columns do not clip it.
  - Approved
- The "⚠️" appears only on warned cells, never on not-applicable cells.
  - Correct
