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

export type { ElectricityFigures, Figure, WaterConsumptionFigures, WaterTreatmentFigures }

export interface MonthFigures {
  month: string
  waterConsumption: WaterConsumptionFigures
  waterTreatment: WaterTreatmentFigures
  electricity: ElectricityFigures
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
  }
}

export function computePeriodFigures(file: ReadonlyPeriodFile): PeriodFigures {
  return { months: file.months.map(monthFigures) }
}
