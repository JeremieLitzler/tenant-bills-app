import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/golden-expected.json'
import golden from '../../../tests/fixtures/golden-period.json'
import type { MonthEntry, PeriodFile } from '../periodFile'
import { occupantRatios } from './figureMath'
import { internetFigures } from './internetFigures'

const months = (golden as unknown as PeriodFile).months
const figuresOf = (month: MonthEntry) =>
  internetFigures(month.internet, occupantRatios(month.common))

describe('internetFigures', () => {
  it('matches the golden record cell for cell', () => {
    months.forEach((month, i) => {
      const got = figuresOf(month) as unknown as Record<string, number | undefined>
      // A cell missing from the golden record, or a figure without one, must fail.
      expect(Object.keys(got).sort()).toEqual(Object.keys(expected.months[i].internet).sort())
      for (const [key, value] of Object.entries(expected.months[i].internet)) {
        expect(got[key], `${month.month} ${key}`).toBeCloseTo(value as number, 6)
      }
    })
  })

  it('makes the amounts uncomputable when the bill is emptied', () => {
    const month = structuredClone(months[0])
    delete month.internet.billedAmount
    const figures = figuresOf(month)
    expect(figures.landlordShare).toBeUndefined()
    expect(figures.tenantShare).toBeUndefined()
    expect(figures.bill).toBeUndefined()
  })
})
