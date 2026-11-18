import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/golden-expected.json'
import golden from '../../../tests/fixtures/golden-period.json'
import type { MonthEntry, PeriodFile } from '../periodFile'
import { electricityFigures } from './electricityFigures'
import { occupantRatios } from './figureMath'

const months = (golden as unknown as PeriodFile).months
const figuresOf = (month: MonthEntry) => electricityFigures(month, occupantRatios(month.common))
const july = 10 // the base > hchp switch month
const august = 11 // back to base, billed per month

describe('electricityFigures', () => {
  it('matches the golden record cell for cell, tariff switch months included', () => {
    months.forEach((month, i) => {
      const got = figuresOf(month) as unknown as Record<string, number | undefined>
      for (const [key, value] of Object.entries(expected.months[i].electricity)) {
        expect(got[key], `${month.month} ${key}`).toBeCloseTo(value as number, 6)
      }
    })
  })

  it('ignores leftover values in the inactive mode keys', () => {
    const noisy = structuredClone(months)
    Object.assign(noisy[0].electricity, { mainHc: 9e6, mainHcPrevious: 1, kwhPriceHc: 99 })
    Object.assign(noisy[july].electricity, { mainBase: 9e6, kwhPriceBase: 99 })
    delete noisy[august].electricity.kwhPriceHp
    for (const i of [0, july, august]) {
      expect(figuresOf(noisy[i])).toEqual(figuresOf(months[i]))
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
    expect(emptied((m) => delete m.electricity.tariffMode).bill).toBeUndefined()
    expect(emptied((m) => (m.common.endDate = '2000-01-01')).subscriptionUnits).toBeUndefined()

    const hchp = emptied((m) => delete m.electricity.mainHpPrevious, july)
    expect(hchp.landlordShare).toBeUndefined()
    expect(hchp.tenantShare).toBeCloseTo(expected.months[july].electricity.tenantShare, 6)
  })
})
