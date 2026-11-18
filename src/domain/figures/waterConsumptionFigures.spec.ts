import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/golden-expected.json'
import golden from '../../../tests/fixtures/golden-period.json'
import type { MonthEntry, PeriodFile } from '../periodFile'
import { occupantRatios } from './figureMath'
import { waterConsumptionFigures } from './waterConsumptionFigures'

const months = (golden as unknown as PeriodFile).months
const figuresOf = (month: MonthEntry) =>
  waterConsumptionFigures(month.waterConsumption, occupantRatios(month.common))

describe('waterConsumptionFigures', () => {
  it('matches the golden record cell for cell', () => {
    months.forEach((month, i) => {
      const got = figuresOf(month) as unknown as Record<string, number | undefined>
      for (const [key, value] of Object.entries(expected.months[i].waterConsumption)) {
        expect(got[key], `${month.month} ${key}`).toBeCloseTo(value as number, 6)
      }
    })
  })

  it('makes the amounts uncomputable when a price is emptied', () => {
    const month = structuredClone(months[0])
    delete month.waterConsumption.pricePerM3
    const figures = figuresOf(month)
    expect(figures.landlordShare).toBeUndefined()
    expect(figures.tenantShare).toBeUndefined()
    expect(figures.bill).toBeUndefined()
  })

  it('makes the dependent amounts uncomputable when an index is emptied', () => {
    const month = structuredClone(months[0])
    delete month.waterConsumption.studioSoftenedMeter
    const figures = figuresOf(month)
    expect(figures.deltaStudioSoftened).toBeUndefined()
    expect(figures.tenantShare).toBeUndefined()
    expect(figures.landlordShare).toBeCloseTo(expected.months[0].waterConsumption.landlordShare, 6)
  })
})
