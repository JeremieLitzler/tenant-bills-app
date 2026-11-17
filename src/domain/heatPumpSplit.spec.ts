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
})
