import { describe, expect, it } from 'vitest'

import expected from '../../tests/fixtures/golden-expected.json'
import golden from '../../tests/fixtures/golden-period.json'
import { computePeriodFigures } from './periodFigures'
import type { PeriodFile } from './periodFile'

const file = golden as unknown as PeriodFile
const cloneFile = (): PeriodFile => structuredClone(file)

describe('computePeriodFigures, water and electricity', () => {
  const figures = computePeriodFigures(file)

  it('matches the golden record cell for cell', () => {
    expect(figures.months).toHaveLength(expected.months.length)
    figures.months.forEach((month, i) => {
      const want = expected.months[i]
      expect(month.month).toBe(want.month)
      for (const section of ['waterConsumption', 'waterTreatment', 'electricity'] as const) {
        for (const [key, value] of Object.entries(want[section])) {
          const got = (month[section] as unknown as Record<string, number | undefined>)[key]
          expect(got, `${want.month} ${section}.${key}`).toBeCloseTo(value as number, 6)
        }
      }
    })
  })

  it('makes the amounts uncomputable when a price is emptied', () => {
    const broken = cloneFile()
    delete broken.months[0].waterConsumption.pricePerM3
    const [first, second] = computePeriodFigures(broken).months
    expect(first.waterConsumption.landlordShare).toBeUndefined()
    expect(first.waterConsumption.tenantShare).toBeUndefined()
    expect(first.waterConsumption.bill).toBeUndefined()
    expect(first.waterTreatment.bill).toBeCloseTo(expected.months[0].waterTreatment.bill, 6)
    expect(second.waterConsumption.bill).toBeDefined()
  })

  it('makes the dependent amounts uncomputable when an index is emptied', () => {
    const broken = cloneFile()
    delete broken.months[0].waterConsumption.studioSoftenedMeter
    const [first] = computePeriodFigures(broken).months
    expect(first.waterConsumption.deltaStudioSoftened).toBeUndefined()
    expect(first.waterConsumption.tenantShare).toBeUndefined()
    expect(first.waterTreatment.tenantShare).toBeUndefined()
    expect(first.waterTreatment.landlordShare).toBeUndefined()
    expect(first.waterConsumption.landlordShare).toBeCloseTo(
      expected.months[0].waterConsumption.landlordShare,
      6,
    )
  })

  const july = 10 // the base > hchp switch month
  const august = 11 // back to base, billed per month

  it('ignores leftover values in the inactive mode keys', () => {
    const noisy = cloneFile()
    Object.assign(noisy.months[0].electricity, { mainHc: 9e6, mainHcPrevious: 1, kwhPriceHc: 99 })
    Object.assign(noisy.months[july].electricity, { mainBase: 9e6, kwhPriceBase: 99 })
    delete noisy.months[august].electricity.kwhPriceHp
    const months = computePeriodFigures(noisy).months
    for (const i of [0, july, august]) {
      expect(months[i].electricity).toEqual(figures.months[i].electricity)
    }
  })

  it('counts the days for a per-day subscription and one unit for a per-month one', () => {
    expect(figures.months[0].electricity.subscriptionUnits).toBe(41)
    expect(figures.months[july].electricity.subscriptionUnits).toBe(1)
    const switched = cloneFile()
    switched.months[0].electricity.subscriptionUnit = 'month'
    expect(computePeriodFigures(switched).months[0].electricity.subscriptionUnits).toBe(1)
  })

  it('makes the dependent amounts uncomputable when an electricity input is emptied', () => {
    const broken = cloneFile()
    delete broken.months[0].electricity.studioBase
    delete broken.months[1].electricity.vat
    delete broken.months[july].electricity.mainHpPrevious
    delete broken.months[2].common.startDate
    delete broken.months[3].electricity.tariffMode
    broken.months[4].common.endDate = '2026-01-01' // before its start date
    const months = computePeriodFigures(broken).months
    const [first, second, third] = months
    expect(first.electricity.deltaStudioBase).toBeUndefined()
    expect(first.electricity.tenantShare).toBeUndefined()
    expect(first.electricity.bill).toBeUndefined()
    expect(first.electricity.landlordShare).toBeCloseTo(
      expected.months[0].electricity.landlordShare,
      6,
    )
    expect(second.electricity.landlordShare).toBeUndefined()
    expect(third.electricity.subscriptionUnits).toBeUndefined()
    expect(third.electricity.bill).toBeUndefined()
    expect(months[3].electricity.bill).toBeUndefined()
    expect(months[4].electricity.subscriptionUnits).toBeUndefined()
    expect(months[4].electricity.bill).toBeUndefined()
    expect(months[july].electricity.landlordShare).toBeUndefined()
    expect(months[july].electricity.tenantShare).toBeCloseTo(
      expected.months[july].electricity.tenantShare,
      6,
    )
  })
})
