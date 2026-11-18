import { describe, expect, it } from 'vitest'

import golden from '../../tests/fixtures/golden-period.json'
import { electricityFigures } from './figures/electricityFigures'
import { occupantRatios } from './figures/figureMath'
import { computePeriodFigures } from './periodFigures'
import type { PeriodFile } from './periodFile'

// The figures of each section are specified in their own file; this only checks the assembly.
describe('computePeriodFigures', () => {
  const file = golden as unknown as PeriodFile
  const { months } = computePeriodFigures(file)

  it('gives one entry per month, in order, with every section', () => {
    expect(months.map((m) => m.month)).toEqual(file.months.map((m) => m.month))
    for (const month of months) {
      expect(month.waterConsumption).toBeDefined()
      expect(month.waterTreatment).toBeDefined()
      expect(month.electricity).toBeDefined()
    }
  })

  it('feeds each section the occupant ratios of its month', () => {
    const entry = file.months[0]
    expect(months[0].electricity).toEqual(electricityFigures(entry, occupantRatios(entry.common)))
  })
})
