// The file "Nouvelle période" creates (docs/scenarios.md, Case 5): the top-level values and the
// first month only. Vue-free.
import { splitHeatPumpAnnual } from './heatPumpSplit'
import { suggestedEndDate } from './initializeMonth'
import { FIELD_CATALOGUE } from './periodFile'
import type { MonthEntry, PeriodFile } from './periodFile'
import { SUPPORTED_SCHEMA_VERSION } from './validatePeriodFile'

export interface NewPeriodValues {
  tenantName: string
  monthlyTenantBillAdvance: number
  heatPumpInvoiceEstimate: number
  // "YYYY-MM-DD", may be in the past.
  startDate: string
}

export function newPeriodFile(id: string, values: NewPeriodValues): PeriodFile {
  const first = { month: values.startDate.slice(0, 7) } as Record<string, unknown>
  for (const section of Object.keys(FIELD_CATALOGUE)) first[section] = {}
  const month = first as unknown as MonthEntry
  Object.assign(month.common, {
    startDate: values.startDate,
    endDate: suggestedEndDate(values.startDate),
    tenantBillAdvance: 0,
  })
  if (values.heatPumpInvoiceEstimate > 0) {
    month.heatPumpMaintenance.billedAmount = splitHeatPumpAnnual(values.heatPumpInvoiceEstimate)[0]
  }
  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    periodName: id,
    tenantName: values.tenantName,
    monthlyTenantBillAdvance: values.monthlyTenantBillAdvance,
    heatPumpInvoiceEstimate: values.heatPumpInvoiceEstimate,
    months: [month],
  }
}
