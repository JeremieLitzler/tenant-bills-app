import { describe, expect, it } from 'vitest'

import expected from '@tests/fixtures/golden-expected.json'
import golden from '@tests/fixtures/golden-period.json'
import { computePeriodFigures, type MonthFigures } from './periodFigures'
import type { PeriodFile } from './periodFile'
import { periodTotals } from './periodTotals'
import { monthEntry } from './monthEntry.testHelper'

const file = golden as unknown as PeriodFile

describe('periodTotals on the golden record', () => {
  const totals = periodTotals(file.months, computePeriodFigures(file).months)
  const want = expected.totals

  it('matches the column N totals', () => {
    expect(totals.advancesReceived).toBeCloseTo(want.advancesReceived, 6)
    expect(totals.waterConsumptionTenant).toBeCloseTo(want.waterConsumptionTenant, 6)
    expect(totals.waterTreatmentTenant).toBeCloseTo(want.waterTreatmentTenant, 6)
    expect(totals.electricityTenant).toBeCloseTo(want.electricityTenant, 6)
    expect(totals.waterSoftenerTenant).toBeCloseTo(want.waterSoftenerTenant, 6)
    expect(totals.internetTenant).toBeCloseTo(want.internetTenant, 6)
    expect(totals.heatPumpMaintenanceTenant).toBeCloseTo(want.heatPumpMaintenanceTenant, 6)
  })

  it('matches the balance and the settlement amount and direction', () => {
    expect(totals.balance).toBeCloseTo(want.balance, 6)
    expect(totals.settlementAmount).toBeCloseTo(want.settlementAmount, 6)
    expect(totals.settlementDirection).toBe(want.settlementDirection)
  })
})

// A month where the five shared sections each give `share` to the tenant and the heat pump bill is `bill`.
function month(share: number | undefined, bill: number | undefined): MonthFigures {
  const section = { tenantShare: share }
  return {
    waterConsumption: section,
    waterTreatment: section,
    electricity: section,
    waterSoftener: section,
    internet: section,
    heatPumpMaintenance: { bill },
  } as unknown as MonthFigures
}

describe('periodTotals next advance', () => {
  const entries = [monthEntry()]

  it('rounds up to the euro and returns the exact average next to it', () => {
    const totals = periodTotals(entries, [month(20, 0)]) // 100 / 12 = 8.33...
    expect(totals.averageAdvance).toBeCloseTo(100 / 12, 6)
    expect(totals.nextAdvance).toBe(9)
  })

  it('does not round up a total that divides exactly by 12', () => {
    // 5 x 2.4 = 12.000000000000002 in floats: still exactly 1 euro a month
    const totals = periodTotals(entries, [month(2.4, 0)])
    expect(totals.nextAdvance).toBe(1)
  })

  it('rounds the balance to cents so float noise does not name a debtor', () => {
    // advances 70, shares 5 x 14 = 70: 70 - 70.00000000000001 would be negative noise
    const totals = periodTotals(entries, [month(0.1 + 0.2 + 13.7 - 0.3 + 0.3, 0)])
    expect(totals.balance).toBe(0)
    expect(totals.settlementAmount).toBe(0)
  })

  it('shows an uncomputable share in the totals instead of counting it as zero', () => {
    const totals = periodTotals(entries, [month(20, 0), month(20, undefined)])
    expect(totals.heatPumpMaintenanceTenant).toBeUndefined()
    expect(totals.totalTenantShares).toBeUndefined()
    expect(totals.balance).toBeUndefined()
    expect(totals.settlementDirection).toBeUndefined()
    expect(totals.nextAdvance).toBeUndefined()
  })
})
