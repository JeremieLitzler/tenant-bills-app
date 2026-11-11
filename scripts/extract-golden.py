# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl"]
# ///
"""Extraction of period files and golden values from the sheet.

Real mode (#18): reads the sheet `Période-092025-092026` of the workbook at the repo
root and writes `2025-2026.json` (gitignored: the repo is public, the readings are
private) in the shape of docs/period-file.md. The landlord then uploads it by
hand to JeremieLitzler/tenant-bills-data, at periods/2025-2026.json.

Randomized mode (#56): reads the randomized copy made by scripts/randomize-golden.py
and saved by Excel (so every formula is recalculated), and writes the committed
fixtures `tests/fixtures/golden-period.json` (the inputs, as a period file) and
`tests/fixtures/golden-expected.json` (every computed cell, see "Golden record" in
docs/architecture-tests.md).

Usage:
  uv run scripts/extract-golden.py [workbook] [output]
  uv run scripts/extract-golden.py --randomized [copy] [period-output] [expected-output]

Rules, from docs/period-file.md:
- an inherited key is stored only in the first month and where its value
  changes; a non-inherited key is stored where it holds a value;
- water indexes are litres as integers;
- of the electricity registers, only those of the month's tariff mode are
  stored; HC/HP tariff months hold `hchp`, the others `base`.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SHEET = "Période-092025-092026"
FIRST_COL = 2  # B
MONTHS = 12
CLOSED_ON = "2026-09-12"
PERIOD_START_YEAR = 2025


def build_period(values, formulas) -> dict:

    def cell(row: int, i: int):
        return values.cell(row, FIRST_COL + i).value

    def is_typed(row: int, i: int) -> bool:
        raw = formulas.cell(row, FIRST_COL + i).value
        return not (isinstance(raw, str) and raw.startswith("="))

    def num(row: int, i: int):
        v = cell(row, i)
        if v is None:
            return None
        v = round(float(v), 10)
        return int(v) if v == int(v) and abs(v) < 1e15 else v

    def litres(row: int, i: int) -> int:
        return int(round(float(cell(row, i))))

    def day(row: int, i: int) -> str:
        return cell(row, i).strftime("%Y-%m-%d")

    # Last stored value per inherited key, to store only changes.
    last: dict[str, object] = {}

    def inherit(section: dict, key: str, value, scope: str) -> None:
        if value is None:
            return
        if last.get(scope + key) != value:
            section[key] = value
            last[scope + key] = value

    # Tariff mode per month: a zero base price means HC/HP.
    def mode(i: int) -> str:
        return "base" if num(71, i) else "hchp"

    months = []
    for i in range(MONTHS):
        year = PERIOD_START_YEAR + (1 if i >= 4 else 0)
        month_no = (8 + i) % 12 + 1
        common, wc, wt, ws, el, net, pac = {}, {}, {}, {}, {}, {}, {}

        if i == 0:
            common["readingDatePrevious"] = day(10, 0)
        common["readingDate"] = day(11, i)
        inherit(common, "landlordOccupants", int(num(2, i)), "")
        inherit(common, "tenantOccupants", int(num(3, i)), "")
        common["tenantBillAdvance"] = num(8, i)

        if i == 0:
            wc["mainMeterPrevious"] = litres(13, 0)
        wc["mainMeter"] = litres(14, i)
        if i == 0:
            wc["studioUnsoftenedMeterPrevious"] = litres(16, 0)
        wc["studioUnsoftenedMeter"] = litres(17, i)
        if i == 0:
            wc["studioSoftenedMeterPrevious"] = litres(19, 0)
        wc["studioSoftenedMeter"] = litres(20, i)
        for key, row in [("pricePerM3", 22), ("resourceWithdrawalFee", 23), ("drinkingWaterFee", 24),
                         ("networkPerformanceFee", 25), ("subscription", 26), ("vat", 27)]:
            inherit(wc, key, num(row, i), "wc.")

        for key, row in [("collectionConsumptionDistributor", 44), ("collectionConsumptionCommunity", 45),
                         ("sanitationPerformance", 46), ("vat", 47)]:
            inherit(wt, key, num(row, i), "wt.")

        if (num(83, i) or 0) > 0:
            ws["description"] = cell(82, i)
            ws["quantity"] = num(83, i)
            ws["unitPrice"] = num(84, i)

        m = mode(i)
        switched = i > 0 and m != mode(i - 1)
        inherit(el, "tariffMode", m, "el.")
        inherit(el, "subscriptionUnit", "month" if is_typed(74, i) else "day", "el.")
        # (main base, main hc, main hp, studio base, studio hc, studio hp) = rows (current):
        regs = {"base": [("mainBase", 53), ("studioBase", 59)],
                "hchp": [("mainHc", 55), ("mainHp", 57), ("studioHc", 61), ("studioHp", 63)]}[m]
        for key, row in regs:
            prev_row = row - 1
            # Previous indexes are stored in the first month and in a tariff-switch month
            # (new mode's registers), or when they differ from the previous month's current.
            if i == 0 or switched or num(prev_row, i) != num(row, i - 1):
                el[key + "Previous"] = num(prev_row, i)
            inherit(el, key, num(row, i), "el.")
        for key, row in [("excisePerKwh", 70)]:
            inherit(el, key, num(row, i), "el.")
        price_rows = {"base": [("kwhPriceBase", 71)], "hchp": [("kwhPriceHc", 72), ("kwhPriceHp", 73)]}[m]
        for key, row in price_rows:
            inherit(el, key, num(row, i), "el.")
        inherit(el, "subscriptionPerUnit", num(75, i), "el.")
        inherit(el, "ctaTax", num(76, i), "el.")
        inherit(el, "vat", num(77, i), "el.")

        inherit(net, "billedAmount", num(88, i), "net.")

        if num(92, i):
            pac["billedAmount"] = num(92, i)

        months.append({
            "month": f"{year}-{month_no:02d}",
            "common": common,
            "waterConsumption": wc,
            "waterTreatment": wt,
            "waterSoftener": ws,
            "electricity": el,
            "internet": net,
            "heatPumpMaintenance": pac,
        })

    return {
        "schemaVersion": 1,
        "periodName": "2025-2026",
        "settings": {"monthlyTenantBillAdvance": num(8, 0), "closedOn": CLOSED_ON},
        "months": months,
    }


def build_expected(values) -> dict:
    """Every computed cell of the sheet, as Excel cached it: per month and section, then the totals."""

    def number(row: int, col: int) -> float:
        v = values.cell(row, col).value
        if v is None:
            raise ValueError(f"No cached value at row {row}, column {col}: open the copy in Excel and save it first")
        return float(v)

    months = []
    for i in range(MONTHS):
        col = FIRST_COL + i
        year = PERIOD_START_YEAR + (1 if i >= 4 else 0)
        month_no = (8 + i) % 12 + 1

        def section(**rows: int) -> dict:
            return {key: number(row, col) for key, row in rows.items()}

        months.append({
            "month": f"{year}-{month_no:02d}",
            "waterConsumption": section(deltaMain=15, deltaStudioUnsoftened=18, deltaStudioSoftened=21,
                                        landlordShare=28, tenantShare=29, bill=30),
            "waterTreatment": section(landlordShare=48, tenantShare=49, bill=50),
            "electricity": section(deltaMainBase=64, deltaMainHc=65, deltaMainHp=66,
                                   deltaStudioBase=67, deltaStudioHc=68, deltaStudioHp=69,
                                   subscriptionUnits=74, landlordShare=78, tenantShare=79, bill=80),
            "waterSoftener": section(landlordShare=85, tenantShare=86),
            "internet": section(bill=88, landlordShare=89, tenantShare=90),
            "heatPumpMaintenance": section(bill=92),
        })

    total_col = FIRST_COL + MONTHS  # N
    balance = number(6, total_col)
    return {
        "months": months,
        "totals": {
            "advancesReceived": number(8, total_col),
            "waterConsumptionTenant": number(29, total_col),
            "waterTreatmentTenant": number(49, total_col),
            "electricityTenant": number(79, total_col),
            "waterSoftenerTenant": number(86, total_col),
            "internetTenant": number(90, total_col),
            "heatPumpMaintenanceTenant": number(92, total_col),
            "balance": balance,
            "settlementAmount": number(5, total_col),
            "settlementDirection": "landlordToTenant" if balance > 0 else "tenantToLandlord",
        },
    }


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {path}")


def main() -> None:
    args = sys.argv[1:]
    randomized = bool(args) and args[0] == "--randomized"
    if randomized:
        args = args[1:]
        workbook = Path(args[0]) if len(args) > 0 else ROOT / "golden-randomized.xlsx"
        period_output = Path(args[1]) if len(args) > 1 else ROOT / "tests" / "fixtures" / "golden-period.json"
        expected_output = Path(args[2]) if len(args) > 2 else ROOT / "tests" / "fixtures" / "golden-expected.json"
    else:
        workbook = Path(args[0]) if len(args) > 0 else ROOT / "Suivi des charges de location (v2).xlsx"
        period_output = Path(args[1]) if len(args) > 1 else ROOT / "2025-2026.json"
    values = openpyxl.load_workbook(workbook, data_only=True)[SHEET]
    formulas = openpyxl.load_workbook(workbook)[SHEET]
    write_json(period_output, build_period(values, formulas))
    if randomized:
        write_json(expected_output, build_expected(values))


if __name__ == "__main__":
    main()
