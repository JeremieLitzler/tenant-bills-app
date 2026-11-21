import { describe, expect, it } from 'vitest'

import expected from '@tests/fixtures/golden-expected.json'
import golden from '@tests/fixtures/golden-period.json'
import type { MonthEntry, PeriodFile } from '@/domain/periodFile'
import { occupantRatios } from './figureMath'
import { waterTreatmentFigures } from './waterTreatmentFigures'

const months = (golden as unknown as PeriodFile).months
const figuresOf = (month: MonthEntry) =>
  waterTreatmentFigures(month.waterTreatment, month.waterConsumption, occupantRatios(month.common))

describe('waterTreatmentFigures', () => {
  it('matches the golden record cell for cell', () => {
    months.forEach((month, i) => {
      const got = figuresOf(month) as unknown as Record<string, number | undefined>
      // A cell missing from the golden record, or a figure without one, must fail.
      expect(Object.keys(got).sort()).toEqual(Object.keys(expected.months[i].waterTreatment).sort())
      for (const [key, value] of Object.entries(expected.months[i].waterTreatment)) {
        expect(got[key], `${month.month} ${key}`).toBeCloseTo(value as number, 6)
      }
    })
  })

  it('does not depend on the water consumption prices', () => {
    const month = structuredClone(months[0])
    delete month.waterConsumption.pricePerM3
    expect(figuresOf(month).bill).toBeCloseTo(expected.months[0].waterTreatment.bill, 6)
  })

  it('makes both shares uncomputable when a water index is emptied', () => {
    const month = structuredClone(months[0])
    delete month.waterConsumption.studioSoftenedMeter
    const figures = figuresOf(month)
    expect(figures.tenantShare).toBeUndefined()
    expect(figures.landlordShare).toBeUndefined()
    expect(figures.bill).toBeUndefined()
  })

  it('makes the amounts uncomputable when a treatment price is emptied', () => {
    const month = structuredClone(months[0])
    delete month.waterTreatment.sanitationPerformance
    expect(figuresOf(month).bill).toBeUndefined()
  })
})
