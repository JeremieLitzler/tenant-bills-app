import { describe, expect, it } from 'vitest'

import { validPeriodJson } from '@tests/helpers/periodFile'
import { validatePeriodFile } from './validatePeriodFile'

const PERIOD_ID = '2026-2027'
const problemsOf = (raw: unknown) => validatePeriodFile(raw).problems

describe('validatePeriodFile', () => {
  it('accepts a valid file with no problem', () => {
    const result = validatePeriodFile(validPeriodJson())

    expect(result.problems).toEqual([])
    expect(result.file?.periodName).toBe(PERIOD_ID)
    expect(result.file?.months).toHaveLength(12)
  })

  it.each([
    ['older than 2 (schemaVersion 1)', 1],
    ['unknown (0)', 0],
    ['newer than the app', 3],
    ['not an integer', '2'],
  ])('flags a schemaVersion %s but keeps the file', (_label, schemaVersion) => {
    const result = validatePeriodFile({ ...validPeriodJson(), schemaVersion })

    expect(result.problems).toEqual(['schema-version'])
    expect(result.file).toBeDefined()
  })

  it('accepts a period starting in any month, with fewer than twelve months', () => {
    const raw = validPeriodJson()
    raw.months = raw.months.slice(0, 1)
    raw.months[0].month = '2026-04'

    expect(problemsOf(raw)).toEqual([])
  })

  it('flags an empty months array', () => {
    const raw = validPeriodJson()
    raw.months = []

    expect(problemsOf(raw)).toEqual(['months'])
  })

  it('flags more than twelve months', () => {
    const raw = validPeriodJson()
    raw.months.push({ ...raw.months[11], month: '2027-09' })

    expect(problemsOf(raw)).toEqual(['months'])
  })

  it('flags months in the wrong order', () => {
    const raw = validPeriodJson()
    raw.months.reverse()

    expect(problemsOf(raw)).toEqual(['months'])
  })

  it('flags a duplicated month', () => {
    const raw = validPeriodJson()
    raw.months[1].month = raw.months[0].month

    expect(problemsOf(raw)).toEqual(['months'])
  })

  it('flags a month that is not a "YYYY-MM"', () => {
    const raw = validPeriodJson()
    raw.months[2].month = '2026-13'

    expect(problemsOf(raw)).toEqual(['months'])
  })

  it('flags a month lacking one of the seven sections', () => {
    const raw = validPeriodJson()
    delete (raw.months[3] as Partial<(typeof raw.months)[number]>).internet

    expect(problemsOf(raw)).toEqual(['sections'])
  })

  it('reports a missing section even when the months are also wrong', () => {
    const raw = validPeriodJson()
    delete (raw.months[3] as Partial<(typeof raw.months)[number]>).internet
    raw.months.reverse()

    expect(problemsOf(raw)).toEqual(['months', 'sections'])
  })

  it('does not require tenantBillAdvance in a month', () => {
    const raw = validPeriodJson()
    raw.months[3].common = {} as { tenantBillAdvance: number }

    expect(problemsOf(raw)).toEqual([])
  })

  it('flags a non-integer water index', () => {
    const raw = validPeriodJson()
    Object.assign(raw.months[0].waterConsumption, { mainMeter: 533117.5 })

    expect(problemsOf(raw)).toEqual(['water-index'])
  })

  it('accepts integer water indexes, including a previous index', () => {
    const raw = validPeriodJson()
    Object.assign(raw.months[0].waterConsumption, {
      mainMeterPrevious: 525690,
      mainMeter: 533117,
    })

    expect(problemsOf(raw)).toEqual([])
  })

  it.each(['31/08/2027', '2027-02-30', 'nope'])('flags a closedOn of %s', (closedOn) => {
    expect(problemsOf({ ...validPeriodJson(), closedOn })).toEqual(['closed-on'])
  })

  it('accepts a well-formed closedOn', () => {
    expect(problemsOf({ ...validPeriodJson(), closedOn: '2027-08-31' })).toEqual([])
  })

  it('reports every broken rule at once', () => {
    const raw = { ...validPeriodJson(), schemaVersion: 9, closedOn: 'nope' }
    raw.months = []

    expect(problemsOf(raw)).toEqual(['schema-version', 'months', 'closed-on'])
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'hello'],
    ['an object without months', { schemaVersion: 2, periodName: PERIOD_ID }],
    ['an object without periodName', { schemaVersion: 2, months: [] }],
  ])('has no file for %s (unreadable)', (_label, raw) => {
    expect(validatePeriodFile(raw).file).toBeUndefined()
  })
})
