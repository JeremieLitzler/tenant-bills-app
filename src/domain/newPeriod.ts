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

// The period name: the start year and the next one (2025-09-15 gives 2025-2026).
export function periodIdFromStart(startDate: string): string {
  const year = Number(startDate.slice(0, 4))
  return `${year}-${year + 1}`
}

export type NewPeriodField = keyof NewPeriodValues

// The creation form's raw texts against the rules of docs/scenarios.md, Case 5: a name, an advance
// above 0, a heat pump estimate of 0 or more, a real date. Returns the values, or the first bad field.
export function checkNewPeriod(
  raw: Record<NewPeriodField, string>,
): { values: NewPeriodValues } | { invalid: NewPeriodField } {
  const values: NewPeriodValues = {
    tenantName: raw.tenantName.trim(),
    monthlyTenantBillAdvance: Number(raw.monthlyTenantBillAdvance),
    heatPumpInvoiceEstimate: Number(raw.heatPumpInvoiceEstimate),
    startDate: raw.startDate,
  }
  if (!values.tenantName) return { invalid: 'tenantName' }
  if (!(values.monthlyTenantBillAdvance > 0)) return { invalid: 'monthlyTenantBillAdvance' }
  if (!(values.heatPumpInvoiceEstimate >= 0)) return { invalid: 'heatPumpInvoiceEstimate' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.startDate) || isNaN(Date.parse(values.startDate))) {
    return { invalid: 'startDate' }
  }
  return { values }
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
