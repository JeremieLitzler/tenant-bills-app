# Grilling round v03 — v1 test scope (issue #6)

## Settled in v02

- Q12: a script copies the workbook and writes randomized inputs into the copy (formulas untouched, recalculation forced on open); you open the copy in Excel once and save it so Excel recalculates; an extraction script then reads inputs and cached results from it. The copy stays gitignored.
- Q13 (partly, the rest is Q19 to Q21): the water and electricity meter readings are randomized while each meter's index keeps increasing month to month; the water softener purchases are randomized; the internet bill is set to 30 every month; the heat pump maintenance is set to 169.
- Q14: the scripts are Python with `openpyxl`, since producing the fixture is a one-off task.
- Q15: `tests/fixtures/golden-period.json` (the randomized period file, valid in the shape of `docs/period-file.md`) and `tests/fixtures/golden-expected.json` (every computed cell of Q4), both written by the extraction script.
- Q16: the component tests mock the composable and assert on the patch the view hands it on blur, and on inherited values being shown.
- Q17: the CI workflow shows the coverage as a table in the run's job summary, with no pull request comment.
- Q18: the test decisions are written in a new `docs/architecture-tests.md`, not in a section of `docs/architecture.md`.

Facts I looked up: Python 3.15.2 and `uv` 0.13.6 are installed on this machine.

## Q19 - How much the readings and softener purchases move

Your Q13 answer says "randomize" without an amount. Proposed: each meter's monthly delta, and each water softener purchase amount, is multiplied by a random factor between 0.85 and 1.15 (seeded, so a rerun gives the same values); the indexes are rebuilt from the first previous index plus the new deltas and rounded to whole litres (water) or whole kWh (electricity); softener amounts keep two decimals.

Is that the range and rounding?

➡️ Recommendation: yes. Fifteen percent hides the real consumption while keeping the numbers plausible, and since deltas stay positive the indexes always increase, as you asked.

### Answer to Q19

yes

## Q20 - Inputs not mentioned in Q13

Your Q13 answer leaves out the following inputs. Proposed: they keep their real values.

- Unit prices and fees: `kwhPriceBase` and the HC/HP prices, `excisePerKwh`, `ctaTax`, `vat`, electricity `subscription`, the water fees (`drinkingWaterFee`, `networkPerformanceFee`, `resourceWithdrawalFee`, `sanitationPerformance`, `collectionConsumptionCommunity`, `collectionConsumptionDistributor`, `subscriptionPerUnit`, `subscriptionUnit`).
- Reading dates, occupant counts, tariff modes.
- The monthly tenant bill advance and the advances received.

Do they keep their real values?

➡️ Recommendation: yes. Prices and fees are public tariffs, not consumption, and dates, counts and advances say nothing about how much was consumed; the advance of 70 is already public in `docs/examples/2026-2027.json`.

### Answer to Q20

yes

## Q21 - Which months get the heat pump maintenance of 169

The heat pump maintenance is not billed every month. When you say "set to 169", which months does it apply to?

- a) Only the months where the sheet already has a heat pump maintenance amount; the other months stay empty.
- b) Every month.

➡️ Recommendation: a. It keeps the real billing pattern, so the spec still exercises months with and without that bill.

### Answer to Q21

A

## Q22 - Are the Python scripts still committed

Q2 settled that the script is committed under `scripts/` so the fixture can be regenerated; Q14 chose Python "since this is a one-off task". Does the one-off nature change Q2?

- a) Commit both scripts (randomize, extract) under `scripts/`, as Q2 said.
- b) Do not commit them; only the two fixture files are committed.

➡️ Recommendation: a. They are small, they document where every expected number comes from, and they save the work if the sheet's formulas change again, as they did on 2026-10-28.

### Answer to Q22

A

## Q22b - How the Python scripts run

Only applies if Q22 is a. Options:

- a) Each script declares its dependency (`openpyxl`) in an inline metadata header (PEP 723) and runs with `uv run scripts/<name>.py`; no `requirements.txt`, no virtual environment to manage.
- b) A `scripts/requirements.txt` and a virtual environment created by hand.

➡️ Recommendation: a. `uv` is already installed, and the header keeps each script self-contained with no extra file.

### Answer to Q22b

A

## Q23 - Link from `docs/architecture.md`

Should `docs/architecture.md` get one line pointing to `docs/architecture-tests.md`, so a reader of the architecture finds the test decisions?

➡️ Recommendation: yes. One line, no duplicated content.

### Answer to Q23

Yes
