import { describe, expect, it } from 'vitest'

import { validPeriodJson } from '../../tests/helpers/periodFile'
import { validatePeriodFile } from './validatePeriodFile'

const PERIOD_ID = '2026-2027'
describe('validatePeriodFile', () => {
  it('accepts a valid file with no problem', () => {
    const result = validatePeriodFile(validPeriodJson(), PERIOD_ID)

    expect(result.problems).toEqual([])
    expect(result.file?.periodName).toBe(PERIOD_ID)
    expect(result.file?.months).toHaveLength(12)
  })

  it('flags an unknown schemaVersion but keeps the file', () => {
    const raw = { ...validPeriodJson(), schemaVersion: 0 }

    const result = validatePeriodFile(raw, PERIOD_ID)

    expect(result.problems).toEqual(['schema-version'])
    expect(result.file).toBeDefined()
  })

  it('flags a newer schemaVersion', () => {
    const raw = { ...validPeriodJson(), schemaVersion: 2 }

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['schema-version'])
  })

  it('flags a non-integer schemaVersion', () => {
    const raw = { ...validPeriodJson(), schemaVersion: '1' }

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['schema-version'])
  })

  it('flags months that are not the twelve months in order', () => {
    const raw = validPeriodJson()
    raw.months.reverse()

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['months'])
  })

  it('flags eleven months', () => {
    const raw = validPeriodJson()
    raw.months.pop()

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['months'])
  })

  it('flags months that belong to another period', () => {
    expect(validatePeriodFile(validPeriodJson(), '2027-2028').problems).toEqual(['months'])
  })

  it('flags a period name whose second year is not the year after the first', () => {
    const raw = validPeriodJson('2026-2030')

    expect(validatePeriodFile(raw, '2026-2030').problems).toEqual(['months'])
  })

  it('flags a tenantBillAdvance that is not a finite number', () => {
    const raw = validPeriodJson()
    raw.months[1].common.tenantBillAdvance = Number.NaN

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['tenant-bill-advance'])
  })

  it('flags a month without common.tenantBillAdvance', () => {
    const raw = validPeriodJson()
    raw.months[3].common = {} as { tenantBillAdvance: number }

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['tenant-bill-advance'])
  })

  it('flags a non-integer water index', () => {
    const raw = validPeriodJson()
    Object.assign(raw.months[0].waterConsumption, { mainMeter: 533117.5 })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['water-index'])
  })

  it('accepts integer water indexes, including a previous index', () => {
    const raw = validPeriodJson()
    Object.assign(raw.months[0].waterConsumption, {
      mainMeterPrevious: 525690,
      mainMeter: 533117,
    })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual([])
  })

  it('flags a malformed settings.closedOn', () => {
    const raw = validPeriodJson()
    Object.assign(raw.settings, { closedOn: '31/08/2027' })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['closed-on'])
  })

  it('flags a closedOn that is not a real date', () => {
    const raw = validPeriodJson()
    Object.assign(raw.settings, { closedOn: '2027-02-30' })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual(['closed-on'])
  })

  it('accepts a well-formed settings.closedOn', () => {
    const raw = validPeriodJson()
    Object.assign(raw.settings, { closedOn: '2027-08-31' })

    expect(validatePeriodFile(raw, PERIOD_ID).problems).toEqual([])
  })

  it('reports every broken rule at once', () => {
    const raw = { ...validPeriodJson(), schemaVersion: 9 }
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
