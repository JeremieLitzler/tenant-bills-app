import { describe, expect, it } from 'vitest'

import { validatePeriodFile } from './validatePeriodFile'

const PERIOD_ID = '2026-2027'
const MONTHS = [
  '2026-09',
  '2026-10',
  '2026-11',
  '2026-12',
  '2027-01',
  '2027-02',
  '2027-03',
  '2027-04',
  '2027-05',
  '2027-06',
  '2027-07',
  '2027-08',
]

// A fresh valid period file as plain JSON, so each test can break one rule.
function validRaw() {
  return {
    schemaVersion: 1,
    periodName: PERIOD_ID,
    settings: { monthlyTenantBillAdvance: 70 },
    months: MONTHS.map((month) => ({
      month,
      common: { tenantBillAdvance: 0 },
      waterConsumption: {},
      waterTreatment: {},
      waterSoftener: {},
      electricity: {},
      internet: {},
      heatPumpMaintenance: {},
    })),
  }
}

describe('validatePeriodFile', () => {
  it('accepts a valid file with no problem', () => {
    const result = validatePeriodFile(validRaw(), PERIOD_ID)

    expect(result.problems).toEqual([])
    expect(result.file?.periodName).toBe(PERIOD_ID)
    expect(result.file?.months).toHaveLength(12)
  })

  it('flags an unknown schemaVersion but keeps the file', () => {
    const raw = { ...validRaw(), schemaVersion: 0 }

    const result = validatePeriodFile(raw, PERIOD_ID)

    expect(result.problems).toEqual(['schema-version'])
    expect(result.file).toBeDefined()
  })

  it('flags a newer schemaVersion', () => {
    const raw = { ...validRaw(), schemaVersion: 2 }

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['schema-version'])
  })

  it('flags a non-integer schemaVersion', () => {
    const raw = { ...validRaw(), schemaVersion: '1' }

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['schema-version'])
  })

  it('flags months that are not the twelve months in order', () => {
    const raw = validRaw()
    raw.months.reverse()

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['months'])
  })

  it('flags eleven months', () => {
    const raw = validRaw()
    raw.months.pop()

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['months'])
  })

  it('flags months that belong to another period', () => {
    expect(validatePeriodFile(validRaw(), '2027-2028').problems).toEqual(['months'])
  })

  it('flags a month without common.tenantBillAdvance', () => {
    const raw = validRaw()
    raw.months[3].common = {} as { tenantBillAdvance: number }

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['tenant-bill-advance'])
  })

  it('flags a non-integer water index', () => {
    const raw = validRaw()
    Object.assign(raw.months[0].waterConsumption, { mainMeter: 533117.5 })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['water-index'])
  })

  it('accepts integer water indexes, including a previous index', () => {
    const raw = validRaw()
    Object.assign(raw.months[0].waterConsumption, {
      mainMeterPrevious: 525690,
      mainMeter: 533117,
    })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual([])
  })

  it('flags a malformed settings.closedOn', () => {
    const raw = validRaw()
    Object.assign(raw.settings, { closedOn: '31/08/2027' })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['closed-on'])
  })

  it('flags a closedOn that is not a real date', () => {
    const raw = validRaw()
    Object.assign(raw.settings, { closedOn: '2027-02-30' })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['closed-on'])
  })

  it('accepts a well-formed settings.closedOn', () => {
    const raw = validRaw()
    Object.assign(raw.settings, { closedOn: '2027-08-31' })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual([])
  })

  it('reports every broken rule at once', () => {
    const raw = { ...validRaw(), schemaVersion: 9 }
    raw.months.pop()
    Object.assign(raw.settings, { closedOn: 'nope' })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual([
      'schema-version',
      'months',
      'closed-on',
    ])
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'hello'],
    ['an object without months', { schemaVersion: 1, periodName: PERIOD_ID, settings: {} }],
    ['an object without periodName', { schemaVersion: 1, settings: {}, months: [] }],
    ['an object without settings', { schemaVersion: 1, periodName: PERIOD_ID, months: [] }],
  ])('has no file for %s (unreadable)', (_label, raw) => {
    expect(validatePeriodFile(raw, PERIOD_ID).file).toBeUndefined()
  })
})
