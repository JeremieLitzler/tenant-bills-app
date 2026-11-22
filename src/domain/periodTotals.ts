// The period totals, balance, settlement and next advance (docs/reference/sheet-formulas.md,
// "Settlement"). Computed from the month figures, Vue-free.
import type { MonthEntry } from './periodFile'
import type { MonthFigures } from './periodFigures'
import { allDefined, sum, type Figure } from './figures/figureMath'

export type SettlementDirection = 'landlordToTenant' | 'tenantToLandlord'

export interface PeriodTotals {
  advancesReceived: number
  waterConsumptionTenant: Figure
  waterTreatmentTenant: Figure
  electricityTenant: Figure
  waterSoftenerTenant: Figure
  internetTenant: Figure
  heatPumpMaintenanceTenant: Figure
  totalTenantShares: Figure
  balance: Figure
  settlementAmount: Figure
  settlementDirection: SettlementDirection | undefined
  // The total tenant shares / 12: exact, then rounded up to the euro.
  averageAdvance: Figure
  nextAdvance: Figure
}

const MONTHS_PER_PERIOD = 12

// A month whose share is uncomputable makes the whole total uncomputable, never a silent zero.
function total(shares: Figure[]): Figure {
  const defined = allDefined(...shares)
  return defined && sum(defined)
}

export function periodTotals(entries: readonly MonthEntry[], months: MonthFigures[]): PeriodTotals {
  const section = (share: (m: MonthFigures) => Figure) => total(months.map(share))
  const waterConsumptionTenant = section((m) => m.waterConsumption.tenantShare)
  const waterTreatmentTenant = section((m) => m.waterTreatment.tenantShare)
  const electricityTenant = section((m) => m.electricity.tenantShare)
  const waterSoftenerTenant = section((m) => m.waterSoftener.tenantShare)
  const internetTenant = section((m) => m.internet.tenantShare)
  // The tenant pays the whole heat pump maintenance bill.
  const heatPumpMaintenanceTenant = section((m) => m.heatPumpMaintenance.bill)
  const totalTenantShares = total([
    waterConsumptionTenant,
    waterTreatmentTenant,
    electricityTenant,
    waterSoftenerTenant,
    internetTenant,
    heatPumpMaintenanceTenant,
  ])
  const advancesReceived = sum(entries.map((e) => e.common.tenantBillAdvance))
  const balance = totalTenantShares === undefined ? undefined : advancesReceived - totalTenantShares
  return {
    advancesReceived,
    waterConsumptionTenant,
    waterTreatmentTenant,
    electricityTenant,
    waterSoftenerTenant,
    internetTenant,
    heatPumpMaintenanceTenant,
    totalTenantShares,
    balance,
    settlementAmount: balance === undefined ? undefined : Math.abs(balance),
    settlementDirection:
      balance === undefined ? undefined : balance > 0 ? 'landlordToTenant' : 'tenantToLandlord',
    averageAdvance:
      totalTenantShares === undefined ? undefined : totalTenantShares / MONTHS_PER_PERIOD,
    // Whole cents, so a float residue such as 600.0000000001 does not push an exact total up a euro.
    nextAdvance:
      totalTenantShares === undefined
        ? undefined
        : Math.ceil(Math.round(totalTenantShares * 100) / (MONTHS_PER_PERIOD * 100)),
  }
}
