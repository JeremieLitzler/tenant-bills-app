import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/golden-expected.json'
import golden from '../../../tests/fixtures/golden-period.json'
import type { MonthEntry, PeriodFile } from '../periodFile'
import { occupantRatios } from './figureMath'
import { waterSoftenerFigures } from './waterSoftenerFigures'

const months = (golden as unknown as PeriodFile).months
const figuresOf = (month: MonthEntry) =>
  waterSoftenerFigures(month.waterSoftener, occupantRatios(month.common))

describe('waterSoftenerFigures', () => {
  it('matches the golden record cell for cell', () => {
    months.forEach((month, i) => {
      const got = figuresOf(month) as unknown as Record<string, number | undefined>
      // A cell missing from the golden record, or a figure without one, must fail.
      expect(Object.keys(got).sort()).toEqual(Object.keys(expected.months[i].waterSoftener).sort())
      for (const [key, value] of Object.entries(expected.months[i].waterSoftener)) {
        expect(got[key], `${month.month} ${key}`).toBeCloseTo(value as number, 6)
      }
    })
  })

  it('makes the shares uncomputable when only the unit price is emptied', () => {
    const month = structuredClone(months[0])
    delete month.waterSoftener.unitPrice
    const figures = figuresOf(month)
    expect(figures.landlordShare).toBeUndefined()
    expect(figures.tenantShare).toBeUndefined()
  })

  it('costs nothing for a quantity of 0 without a unit price', () => {
    const month = structuredClone(months[0])
    month.waterSoftener = { quantity: 0 }
    expect(figuresOf(month).tenantShare).toBe(0)
  })

  it('makes the shares uncomputable without occupants', () => {
    const month = structuredClone(months[0])
    delete month.common.tenantOccupants
    expect(figuresOf(month).tenantShare).toBeUndefined()
  })
})
