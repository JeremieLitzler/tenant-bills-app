# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl"]
# ///
"""Build the randomized copy of the sheet that Excel recalculates for the golden record.

Copies the workbook into a gitignored file (`*.xlsx`) and writes seeded randomized
inputs into the sheet `Période-092025-092026`, leaving every formula untouched and
forcing a full recalculation when Excel opens it. See "Golden record" in
docs/architecture-tests.md.

Usage: uv run scripts/randomize-golden.py [workbook] [output]

What changes (a rerun gives the same values: the generator is seeded):
- each water and electricity meter's monthly delta is multiplied by a factor in
  [0.85, 1.15]; the indexes are rebuilt from the meter's first previous index
  (itself scaled, so no real index survives; a zero stays zero), so they keep
  increasing; water in whole litres, electricity in whole kWh;
- a previous index typed in a later month (meter replaced, tariff switch) keeps the
  gap it had with the previous month's current index, scaled like a delta;
- each water softener purchase's unit price is multiplied by a factor in
  [0.85, 1.15], rounded to two decimals;
- the internet bill is 30 every month;
- the heat pump maintenance is 169 in the months that already have one.
Everything else keeps its real value.
"""

import random
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SHEET = "Période-092025-092026"
FIRST_COL = 2  # B
MONTHS = 12
SEED = 20250914
FACTOR_MIN, FACTOR_MAX = 0.85, 1.15
INTERNET_BILL = 30
HEAT_PUMP_MAINTENANCE = 169

# (current row, previous row) per meter
WATER_METERS = [(14, 13), (17, 16), (20, 19)]
ELECTRICITY_METERS = [(53, 52), (55, 54), (57, 56), (59, 58), (61, 60), (63, 62)]
SOFTENER_QUANTITY_ROW, SOFTENER_UNIT_PRICE_ROW = 83, 84
INTERNET_ROW = 88
HEAT_PUMP_ROW = 92


def is_formula(value) -> bool:
    return isinstance(value, str) and value.startswith("=")


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "Suivi des charges de location (v2).xlsx"
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "golden-randomized.xlsx"

    real = openpyxl.load_workbook(source, data_only=True)[SHEET]
    workbook = openpyxl.load_workbook(source)
    sheet = workbook[SHEET]
    rng = random.Random(SEED)

    def factor() -> float:
        return rng.uniform(FACTOR_MIN, FACTOR_MAX)

    def real_at(row: int, i: int) -> float:
        return float(real.cell(row, FIRST_COL + i).value or 0)

    def randomize_meter(current_row: int, previous_row: int) -> None:
        previous_new = 0
        for i in range(MONTHS):
            col = FIRST_COL + i
            previous_cell = sheet.cell(previous_row, col)
            real_previous = real_at(previous_row, i)
            if i == 0:
                previous_new = round(real_previous * factor())
                previous_cell.value = previous_new
            elif not is_formula(previous_cell.value):
                # Typed previous index: keep its (scaled) gap with the month before.
                gap = real_previous - real_at(current_row, i - 1)
                previous_new = round(sheet.cell(current_row, col - 1).value + gap * factor())
                previous_cell.value = previous_new
            else:
                previous_new = sheet.cell(current_row, col - 1).value
            delta = real_at(current_row, i) - real_previous
            sheet.cell(current_row, col).value = round(previous_new + delta * factor())

    for current_row, previous_row in WATER_METERS + ELECTRICITY_METERS:
        randomize_meter(current_row, previous_row)

    for i in range(MONTHS):
        col = FIRST_COL + i
        if real_at(SOFTENER_QUANTITY_ROW, i) > 0:
            sheet.cell(SOFTENER_UNIT_PRICE_ROW, col).value = round(real_at(SOFTENER_UNIT_PRICE_ROW, i) * factor(), 2)
        sheet.cell(INTERNET_ROW, col).value = INTERNET_BILL
        if real_at(HEAT_PUMP_ROW, i) > 0:
            sheet.cell(HEAT_PUMP_ROW, col).value = HEAT_PUMP_MAINTENANCE

    workbook.calculation.fullCalcOnLoad = True
    workbook.save(output)
    print(f"Wrote {output}. Open it in Excel and save it, then run scripts/extract-golden.py --randomized.")


if __name__ == "__main__":
    main()
