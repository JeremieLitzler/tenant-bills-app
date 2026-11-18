// The period figures: every computed figure of a period, computed once from the file and only read
// by the views (docs/architecture.md, docs/reference/sheet-formulas.md). Vue-free.
// Each section's figures live in ./figures; this file assembles them month by month.
import type { MonthEntry, ReadonlyPeriodFile } from './periodFile'
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
}

export interface PeriodFigures {
  months: MonthFigures[]
}

function monthFigures(entry: MonthEntry): MonthFigures {
  const ratios = occupantRatios(entry.common)
  return {
    month: entry.month,
    waterConsumption: waterConsumptionFigures(entry.waterConsumption, ratios),
    waterTreatment: waterTreatmentFigures(entry.waterTreatment, entry.waterConsumption, ratios),
    electricity: electricityFigures(entry, ratios),
    waterSoftener: waterSoftenerFigures(entry.waterSoftener, ratios),
    internet: internetFigures(entry.internet, ratios),
    heatPumpMaintenance: heatPumpMaintenanceFigures(entry.heatPumpMaintenance),
  }
}

export function computePeriodFigures(file: ReadonlyPeriodFile): PeriodFigures {
  return { months: file.months.map(monthFigures) }
}
