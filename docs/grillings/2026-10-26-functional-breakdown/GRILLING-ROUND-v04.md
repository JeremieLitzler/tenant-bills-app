# Grilling round v04 — functional breakdown of the tenant bills app

## Settled in v03

- Q19b: the app is installable (manifest with name, icons and `display: standalone`) and built with `vite-plugin-pwa`.
- Q19c: a new deployed version is applied only when you click a "Nouvelle version disponible — Recharger" banner.
- Q24: the auth callback refuses any GitHub login not in an allowlist kept in a Netlify environment variable (`JeremieLitzler`).
- Q25: the settlement view is available for any period, computed with the months entered so far, and labelled "provisoire" until the period is closed.
- Q27: implausible values (index lower than the previous one, reading date before the previous one) are saved and highlighted with a warning, never blocked.
- Q28: formulas are pure TypeScript functions tested with Vitest against the spreadsheet's computed values, except where ADR 0003 changes the formula.
- Q29: the v1 feature list F1 to F10 stands, with **F10 Hosting and CI first**, since F1 onward need the Netlify site and its environment variables. Build order: F10, F1, F2, F3, F4, F5, F6, F7, F8, F9. Prefill in "Nouvelle période" and a tenant view are v2.
- **Q17b in v03 is blank**: please answer it in `GRILLING-ROUND-v03.md`.

## Reopened

- **Q26** (clearing a cell): you asked for an example. Q30 gives it, and Q30b asks the decision again.

## Q30 - Example of clearing a cell

Water price "Coût par m3" (line 18), period 2026-2027:

- September: you typed 1.05. Stored value: 1.05.
- October: nothing typed. The cell shows 1.05 in the "inherited" style. Nothing is stored for October.
- November: the supplier raises the price, so you type 1.12. Stored value for November: 1.12. December onward show 1.12 as inherited.
- Later you realise the raise starts in January, not November. You empty the November cell and blur it.

With the recommendation: November loses its stored value and shows 1.05 again, inherited from September. December shows 1.05 too. You then type 1.12 in January.

The other case is a current index, for example "Index Compteur Général (actuel)" (line 10). It has nothing to inherit, since each month has its own reading. If you empty November's 541.2, the cell stays empty. November's water lines (delta, landlord share, tenant share, bill) show "—" instead of an amount. December's previous index (line 9) also shows "—", because it is November's current index.

No decision here; Q30b is the decision.

➡️ Recommendation: nothing to answer unless the example is wrong.

### Answer to Q30

Example is clear and correct.

## Q30b - Clearing a cell removes its override

When you empty a cell and blur it, its stored value is removed. An inheritable cell (price, occupant count, tariff mode, subscription unit, softener unit price) shows the inherited value again. A non-inheritable cell (current index, charge advance, softener quantity) becomes empty, and the amounts that depend on it show "—".

➡️ Recommendation: yes, as described and as in the Q30 example. Typing 0 stays possible when you really mean zero.

### Answer to Q30b

recommendation is correct
