import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/golden-expected.json'
import golden from '../../../tests/fixtures/golden-period.json'
import type { MonthEntry, PeriodFile } from '../periodFile'
import { electricityFigures } from './electricityFigures'
import { occupantRatios } from './figureMath'

const months = (golden as unknown as PeriodFile).months
const figuresOf = (month: MonthEntry) => electricityFigures(month, occupantRatios(month.common))
const july = 10 // the base > hchp switch month

describe('electricityFigures', () => {
  it('matches the golden record cell for cell, tariff switch months included', () => {
    months.forEach((month, i) => {
      const got = figuresOf(month) as unknown as Record<string, number | undefined>
      for (const [key, value] of Object.entries(expected.months[i].electricity)) {
        expect(got[key], `${month.month} ${key}`).toBeCloseTo(value as number, 6)
      }
    })
  })

  it('ignores leftover values in every key of the inactive mode', () => {
    const inactiveKeys = {
      base: ['mainHc', 'mainHp', 'studioHc', 'studioHp', 'kwhPriceHc', 'kwhPriceHp'],
      hchp: ['mainBase', 'studioBase', 'kwhPriceBase'],
    } as const
    for (const [index, mode] of [
      [0, 'base'],
      [july, 'hchp'],
    ] as const) {
      expect(months[index].electricity.tariffMode).toBe(mode)
      const noisy = structuredClone(months[index])
      const electricity = noisy.electricity as Record<string, unknown>
      for (const key of inactiveKeys[mode]) {
        electricity[key] = 9e6
        if (key.startsWith('kwhPrice')) continue
        electricity[`${key}Previous`] = 1
      }
      expect(figuresOf(noisy)).toEqual(figuresOf(months[index]))
    }
  })

  it('counts the days for a per-day subscription and one unit for a per-month one', () => {
    expect(figuresOf(months[0]).subscriptionUnits).toBe(41)
    expect(figuresOf(months[july]).subscriptionUnits).toBe(1)
    const switched = structuredClone(months[0])
    switched.electricity.subscriptionUnit = 'month'
    expect(figuresOf(switched).subscriptionUnits).toBe(1)
  })

  it('makes the dependent amounts uncomputable when an input is emptied', () => {
    const emptied = (change: (month: MonthEntry) => void, index = 0) => {
      const month = structuredClone(months[index])
      change(month)
      return figuresOf(month)
    }
    const noStudioIndex = emptied((m) => delete m.electricity.studioBase)
    expect(noStudioIndex.deltaStudioBase).toBeUndefined()
    expect(noStudioIndex.tenantShare).toBeUndefined()
    expect(noStudioIndex.bill).toBeUndefined()
    expect(noStudioIndex.landlordShare).toBeCloseTo(expected.months[0].electricity.landlordShare, 6)

    expect(emptied((m) => delete m.electricity.vat).landlordShare).toBeUndefined()
    expect(emptied((m) => delete m.common.startDate).bill).toBeUndefined()
    expect(emptied((m) => (m.common.endDate = '2000-01-01')).subscriptionUnits).toBeUndefined()

    const noMode = emptied((m) => delete m.electricity.tariffMode)
    const { subscriptionUnits, ...everythingElse } = noMode
    expect(subscriptionUnits).toBe(41) // the days do not depend on the tariff mode
    expect(Object.values(everythingElse).every((figure) => figure === undefined)).toBe(true)

    const hchp = emptied((m) => delete m.electricity.mainHpPrevious, july)
    expect(hchp.landlordShare).toBeUndefined()
    expect(hchp.tenantShare).toBeCloseTo(expected.months[july].electricity.tenantShare, 6)
  })
})
