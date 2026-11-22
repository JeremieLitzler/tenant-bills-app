import { describe, expect, it } from 'vitest'

import { monthWarnings } from './monthWarnings'
import type { MonthEntry } from './periodFile'

const month = (parts: Partial<MonthEntry>): MonthEntry =>
  ({
    month: '2026-10',
    common: { tenantBillAdvance: 0 },
    waterConsumption: {},
    waterTreatment: {},
    waterSoftener: {},
    electricity: {},
    internet: {},
    heatPumpMaintenance: {},
    ...parts,
  }) as MonthEntry

describe('monthWarnings', () => {
  it('warns on an index below its previous index, keyed by the index line', () => {
    const warnings = monthWarnings(
      month({
        waterConsumption: { mainMeter: 900, mainMeterPrevious: 1000 },
        electricity: { studioHc: 10, studioHcPrevious: 50 },
      }),
    )
    expect(warnings).toEqual({
      'waterConsumption.mainMeter': 'indexBelowPrevious',
      'electricity.studioHc': 'indexBelowPrevious',
    })
  })

  it('does not warn on an equal or increasing index', () => {
    const warnings = monthWarnings(
      month({
        waterConsumption: { mainMeter: 1000, mainMeterPrevious: 1000 },
        electricity: { mainBase: 120, mainBasePrevious: 100 },
      }),
    )
    expect(warnings).toEqual({})
  })

  it('does not warn when either side of an index is not typed yet', () => {
    expect(monthWarnings(month({ waterConsumption: { mainMeterPrevious: 1000 } }))).toEqual({})
  })

  it('warns when the end date is before the start date, and not when equal or after', () => {
    const common = (startDate: string, endDate: string) =>
      month({ common: { startDate, endDate, tenantBillAdvance: 0 } })
    expect(monthWarnings(common('2026-10-12', '2026-10-11'))).toEqual({
      'common.endDate': 'endBeforeStart',
    })
    expect(monthWarnings(common('2026-10-11', '2026-10-11'))).toEqual({})
    expect(monthWarnings(common('2026-09-12', '2026-10-11'))).toEqual({})
  })

  it('warns when the start date differs from the previous month end date, and not when equal', () => {
    const common = (startDate: string, endDate: string) =>
      month({ common: { startDate, endDate, tenantBillAdvance: 0 } })
    const previous = common('2026-09-12', '2026-10-11')
    expect(monthWarnings(common('2026-10-12', '2026-11-15'), previous)).toEqual({
      'common.startDate': 'startNotPreviousEnd',
    })
    expect(monthWarnings(common('2026-10-11', '2026-11-15'), previous)).toEqual({})
    expect(monthWarnings(common('2026-10-12', '2026-11-15'))).toEqual({})
  })

  it.each([
    ['waterConsumption', 'mainMeter'],
    ['waterConsumption', 'studioUnsoftenedMeter'],
    ['waterConsumption', 'studioSoftenedMeter'],
    ['electricity', 'mainBase'],
    ['electricity', 'mainHc'],
    ['electricity', 'mainHp'],
    ['electricity', 'studioBase'],
    ['electricity', 'studioHc'],
    ['electricity', 'studioHp'],
  ])('warns on a decreasing %s.%s', (section, key) => {
    const entry = month({ [section]: { [key]: 1, [`${key}Previous`]: 2 } })
    expect(monthWarnings(entry)).toEqual({ [`${section}.${key}`]: 'indexBelowPrevious' })
  })
})
