import { describe, expect, it } from 'vitest'

import { resolveFrom, resolveValue } from './inheritance'
import type { MonthEntry, PeriodFile, SectionInputs } from './periodFile'

type Sections = { [S in keyof SectionInputs]?: Partial<SectionInputs[S]> }

function month(name: string, sections: Sections = {}): MonthEntry {
  return {
    month: name,
    common: { tenantBillAdvance: 0, ...sections.common },
    waterConsumption: { ...sections.waterConsumption },
    waterTreatment: { ...sections.waterTreatment },
    waterSoftener: { ...sections.waterSoftener },
    electricity: { ...sections.electricity },
    internet: { ...sections.internet },
    heatPumpMaintenance: { ...sections.heatPumpMaintenance },
  }
}

function period(...months: MonthEntry[]): PeriodFile {
  return {
    schemaVersion: 1,
    periodName: '2026-2027',
    settings: { monthlyTenantBillAdvance: 70 },
    months,
  }
}

describe('resolveValue, inherited keys (I)', () => {
  const file = period(
    month('2026-09', { internet: { billedAmount: 20.99 } }),
    month('2026-10'),
    month('2026-11'),
    month('2026-12', { internet: { billedAmount: 23.48 } }),
    month('2027-01'),
  )

  it('is typed where the landlord typed it', () => {
    expect(resolveValue(file, '2026-09', 'internet', 'billedAmount')).toEqual({
      value: 20.99,
      provenance: 'typed',
    })
  })

  it('takes the previous month value, across several months', () => {
    expect(resolveValue(file, '2026-11', 'internet', 'billedAmount')).toEqual({
      value: 20.99,
      provenance: 'inherited',
    })
    expect(resolveValue(file, '2027-01', 'internet', 'billedAmount')).toEqual({
      value: 23.48,
      provenance: 'inherited',
    })
  })

  it('is empty in the first month when nothing is typed', () => {
    expect(resolveValue(file, '2026-09', 'electricity', 'ctaTax')).toBeUndefined()
  })

  it('treats a typed 0 as typed, not inherited', () => {
    const withZero = period(
      month('2026-09', { electricity: { ctaTax: 2.34 } }),
      month('2026-10', { electricity: { ctaTax: 0 } }),
      month('2026-11'),
    )
    expect(resolveValue(withZero, '2026-10', 'electricity', 'ctaTax')).toEqual({
      value: 0,
      provenance: 'typed',
    })
    expect(resolveValue(withZero, '2026-11', 'electricity', 'ctaTax')).toEqual({
      value: 0,
      provenance: 'inherited',
    })
  })

  it('falls back to inheritance when the key is removed', () => {
    const removed = period(
      month('2026-09', { internet: { billedAmount: 20.99 } }),
      month('2026-10'),
    )
    expect(resolveValue(removed, '2026-10', 'internet', 'billedAmount')).toEqual({
      value: 20.99,
      provenance: 'inherited',
    })
  })
})

describe('resolveValue, non-inherited keys (N)', () => {
  const file = period(
    month('2026-09', {
      waterSoftener: { description: 'sel', quantity: 3, unitPrice: 12 },
      heatPumpMaintenance: { billedAmount: 12.83 },
    }),
    month('2026-10'),
  )

  it('stays empty when untyped, never inherited', () => {
    expect(resolveValue(file, '2026-10', 'waterSoftener', 'quantity')).toBeUndefined()
    expect(resolveValue(file, '2026-10', 'heatPumpMaintenance', 'billedAmount')).toBeUndefined()
  })

  it('is typed when stored, 0 included', () => {
    const zero = period(month('2026-09', { heatPumpMaintenance: { billedAmount: 0 } }))
    expect(resolveValue(zero, '2026-09', 'heatPumpMaintenance', 'billedAmount')).toEqual({
      value: 0,
      provenance: 'typed',
    })
  })

  it('falls back to empty when the key is removed', () => {
    expect(resolveValue(file, '2026-10', 'waterSoftener', 'description')).toBeUndefined()
    expect(resolveValue(file, '2026-09', 'waterSoftener', 'description')?.provenance).toBe('typed')
  })
})

describe('resolveValue, previous indexes', () => {
  const file = period(
    month('2026-09', {
      waterConsumption: { mainMeterPrevious: 525690, mainMeter: 533117 },
      electricity: { mainBasePrevious: 100, mainBase: 150 },
    }),
    month('2026-10', { waterConsumption: { mainMeter: 540000 } }),
    month('2026-11', { waterConsumption: { mainMeterPrevious: 1, mainMeter: 500 } }),
    month('2026-12'),
  )

  it('is the stored previous index in the first month, typed', () => {
    expect(resolveValue(file, '2026-09', 'waterConsumption', 'mainMeterPrevious')).toEqual({
      value: 525690,
      provenance: 'typed',
    })
  })

  it('is the previous month current index, derived, where none is stored', () => {
    expect(resolveValue(file, '2026-10', 'waterConsumption', 'mainMeterPrevious')).toEqual({
      value: 533117,
      provenance: 'derived',
    })
  })

  it('lets a stored previous index win over the previous month current index', () => {
    expect(resolveValue(file, '2026-11', 'waterConsumption', 'mainMeterPrevious')).toEqual({
      value: 1,
      provenance: 'typed',
    })
  })

  it('uses the previous month resolved current index when that month is untyped', () => {
    expect(resolveValue(file, '2026-12', 'waterConsumption', 'mainMeterPrevious')).toEqual({
      value: 500,
      provenance: 'derived',
    })
  })

  it('works for electricity registers', () => {
    const next = period(file.months[0], month('2026-10'))
    expect(resolveValue(next, '2026-10', 'electricity', 'mainBasePrevious')).toEqual({
      value: 150,
      provenance: 'derived',
    })
  })

  it('is empty in the first month when no previous index is stored', () => {
    const bare = period(month('2026-09', { waterConsumption: { mainMeter: 5 } }))
    expect(resolveValue(bare, '2026-09', 'waterConsumption', 'mainMeterPrevious')).toBeUndefined()
  })

  it('keeps water indexes in litres', () => {
    expect(resolveValue(file, '2026-09', 'waterConsumption', 'mainMeter')?.value).toBe(533117)
  })
})

describe('resolveFrom ("Du")', () => {
  const file = period(
    month('2026-09', {
      common: {
        readingDatePrevious: '2026-09-12',
        readingDate: '2026-10-11',
        tenantBillAdvance: 70,
      },
    }),
    month('2026-10', { common: { readingDate: '2026-11-10', tenantBillAdvance: 70 } }),
    month('2026-11'),
  )

  it('is readingDatePrevious in the first month', () => {
    expect(resolveFrom(file, '2026-09')).toEqual({ value: '2026-09-12', provenance: 'typed' })
  })

  it('is the previous month readingDate afterwards', () => {
    expect(resolveFrom(file, '2026-10')).toEqual({ value: '2026-10-11', provenance: 'derived' })
    expect(resolveFrom(file, '2026-11')).toEqual({ value: '2026-11-10', provenance: 'derived' })
  })

  it('is empty when the reference date is not stored', () => {
    const open = period(month('2026-09'), month('2026-10'))
    expect(resolveFrom(open, '2026-09')).toBeUndefined()
    expect(resolveFrom(open, '2026-10')).toBeUndefined()
  })
})
