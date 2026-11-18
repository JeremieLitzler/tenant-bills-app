import { describe, expect, it } from 'vitest'

import { splitHeatPumpAnnual } from './heatPumpSplit'

describe('splitHeatPumpAnnual', () => {
  it('splits 154 into eleven times 12.83 then 12.87', () => {
    const months = splitHeatPumpAnnual(154)
    expect(months).toHaveLength(12)
    expect(months.slice(0, 11)).toEqual(Array(11).fill(12.83))
    expect(months[11]).toBe(12.87)
  })

  it('gives zero every month for an annual amount of 0', () => {
    expect(splitHeatPumpAnnual(0)).toEqual(Array(12).fill(0))
  })

  it('sums exactly to the annual amount', () => {
    for (const annual of [154, 100, 100.01, 99.99, 1, 0.07, 1234.56, 333.33]) {
      const total = splitHeatPumpAnnual(annual).reduce((sum, part) => sum + part, 0)
      expect(total).toBeCloseTo(annual, 6)
    }
  })
})
