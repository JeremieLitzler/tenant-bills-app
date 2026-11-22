import type { MonthEntry } from './periodFile'

// An empty month entry; a test overrides only the sections it exercises.
export function monthEntry(over: Partial<MonthEntry> = {}): MonthEntry {
  return {
    month: '2026-09',
    common: { tenantBillAdvance: 70 },
    waterConsumption: {},
    waterTreatment: {},
    waterSoftener: {},
    electricity: {},
    internet: {},
    heatPumpMaintenance: {},
    ...over,
  }
}
