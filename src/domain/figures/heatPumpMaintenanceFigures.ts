import type { HeatPumpMaintenanceInputs } from '../periodFile'
import type { Figure } from './figureMath'

export interface HeatPumpMaintenanceFigures {
  bill: Figure
}

// The tenant pays all of it: the bill is the month's amount. A month without an amount costs 0.
export function heatPumpMaintenanceFigures(
  heatPump: HeatPumpMaintenanceInputs,
): HeatPumpMaintenanceFigures {
  return { bill: heatPump.billedAmount ?? 0 }
}
