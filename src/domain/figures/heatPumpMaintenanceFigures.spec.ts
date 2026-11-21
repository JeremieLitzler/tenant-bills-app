import { describe, expect, it } from 'vitest'

import expected from '@tests/fixtures/golden-expected.json'
import golden from '@tests/fixtures/golden-period.json'
import type { MonthEntry, PeriodFile } from '@/domain/periodFile'
import { heatPumpMaintenanceFigures } from './heatPumpMaintenanceFigures'

const months = (golden as unknown as PeriodFile).months
const figuresOf = (month: MonthEntry) => heatPumpMaintenanceFigures(month.heatPumpMaintenance)

describe('heatPumpMaintenanceFigures', () => {
  it('matches the golden record cell for cell', () => {
    months.forEach((month, i) => {
      const got = figuresOf(month) as unknown as Record<string, number | undefined>
      // A cell missing from the golden record, or a figure without one, must fail.
      expect(Object.keys(got).sort()).toEqual(
        Object.keys(expected.months[i].heatPumpMaintenance).sort(),
      )
      for (const [key, value] of Object.entries(expected.months[i].heatPumpMaintenance)) {
        expect(got[key], `${month.month} ${key}`).toBeCloseTo(value as number, 6)
      }
    })
  })

  it('gives the month amount in full to the tenant, and 0 without an amount', () => {
    expect(heatPumpMaintenanceFigures({ billedAmount: 12.83 }).bill).toBe(12.83)
    expect(heatPumpMaintenanceFigures({}).bill).toBe(0)
  })
})
