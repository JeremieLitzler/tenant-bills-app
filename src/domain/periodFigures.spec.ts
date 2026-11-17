import { describe, expect, it } from 'vitest'

import expected from '../../tests/fixtures/golden-expected.json'
import golden from '../../tests/fixtures/golden-period.json'
import { computePeriodFigures } from './periodFigures'
import type { PeriodFile } from './periodFile'

const file = golden as unknown as PeriodFile
const cloneFile = (): PeriodFile => structuredClone(file)

describe('computePeriodFigures, water consumption and water treatment', () => {
  const figures = computePeriodFigures(file)

  it('matches the golden record cell for cell', () => {
    expect(figures.months).toHaveLength(expected.months.length)
    figures.months.forEach((month, i) => {
      const want = expected.months[i]
      expect(month.month).toBe(want.month)
      for (const section of ['waterConsumption', 'waterTreatment'] as const) {
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
})
