// The period figures: every computed figure of a period, computed once from the file and only read
// by the views (docs/architecture.md, docs/reference/sheet-formulas.md). Vue-free.
// Each section's figures live in ./figures; this file assembles them month by month.
import type { MonthEntry, ReadonlyPeriodFile } from './periodFile'
import { monthWarnings, type MonthWarnings } from './monthWarnings'
import { electricityFigures, type ElectricityFigures } from './figures/electricityFigures'
import { occupantRatios, type Figure } from './figures/figureMath'
import {
  waterConsumptionFigures,
  type WaterConsumptionFigures,
} from './figures/waterConsumptionFigures'
import { waterTreatmentFigures, type WaterTreatmentFigures } from './figures/waterTreatmentFigures'
import { waterSoftenerFigures, type WaterSoftenerFigures } from './figures/waterSoftenerFigures'
import { internetFigures, type InternetFigures } from './figures/internetFigures'
import {
  heatPumpMaintenanceFigures,
  type HeatPumpMaintenanceFigures,
} from './figures/heatPumpMaintenanceFigures'
import { periodTotals, type PeriodTotals } from './periodTotals'

export type {
  ElectricityFigures,
  Figure,
  HeatPumpMaintenanceFigures,
  InternetFigures,
  WaterConsumptionFigures,
  WaterSoftenerFigures,
  WaterTreatmentFigures,
}

export interface MonthFigures {
  month: string
  waterConsumption: WaterConsumptionFigures
  waterTreatment: WaterTreatmentFigures
  electricity: ElectricityFigures
  waterSoftener: WaterSoftenerFigures
  internet: InternetFigures
  heatPumpMaintenance: HeatPumpMaintenanceFigures
  warnings: MonthWarnings
}

export interface PeriodFigures {
  months: MonthFigures[]
  totals: PeriodTotals
}

function monthFigures(entry: MonthEntry, previousMonth?: MonthEntry): MonthFigures {
  const ratios = occupantRatios(entry.common)
  return {
    month: entry.month,
    waterConsumption: waterConsumptionFigures(entry.waterConsumption, ratios),
    waterTreatment: waterTreatmentFigures(entry.waterTreatment, entry.waterConsumption, ratios),
    electricity: electricityFigures(entry, ratios),
    waterSoftener: waterSoftenerFigures(entry.waterSoftener, ratios),
    internet: internetFigures(entry.internet, ratios),
    heatPumpMaintenance: heatPumpMaintenanceFigures(entry.heatPumpMaintenance),
    warnings: monthWarnings(entry, previousMonth),
  }
}

export function computePeriodFigures(file: ReadonlyPeriodFile): PeriodFigures {
  const months = file.months.map((entry, i) => monthFigures(entry, file.months[i - 1]))
  return { months, totals: periodTotals(file.months, months) }
}
