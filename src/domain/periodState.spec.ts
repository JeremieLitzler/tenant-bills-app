import { describe, expect, it } from 'vitest'

import {
  canClose,
  closeChecks,
  canCreateNewPeriod,
  monthsWithoutAdvance,
  periodStatus,
} from './periodState'
import type { PeriodFile } from './periodFile'
import { completeMonth, validPeriodJson } from '@tests/helpers/periodFile'

const period = (months = 12, over: Partial<PeriodFile> = {}): PeriodFile => {
  const json = validPeriodJson()
  return {
    ...json,
    months: json.months.slice(0, months).map((m) => completeMonth(m.month)),
    ...over,
  } as PeriodFile
}

describe('periodStatus', () => {
  it('is closed when closedOn is present, whatever else is true', () => {
    expect(
      periodStatus(period(12, { closedOn: '2027-10-11' }), {
        previousOpen: true,
        nextDrafted: false,
      }),
    ).toBe('closed')
  })
  it('is draft while the previous period is not closed', () => {
    expect(periodStatus(period(1), { previousOpen: true, nextDrafted: false })).toBe('draft')
  })
  it('is ongoing with months and no previous period still open', () => {
    expect(periodStatus(period(5), { previousOpen: false, nextDrafted: false })).toBe('ongoing')
  })
  it('is ending when the twelfth month exists and the next period is drafted', () => {
    expect(periodStatus(period(12), { previousOpen: false, nextDrafted: true })).toBe('ending')
    expect(periodStatus(period(12), { previousOpen: false, nextDrafted: false })).toBe('ongoing')
  })
})

describe('periodStatus on an impossible combination', () => {
  it('throws for twelve months that are both draft and ending', () => {
    expect(() => periodStatus(period(12), { previousOpen: true, nextDrafted: true })).toThrow()
  })
})

describe('canClose', () => {
  it('is allowed with twelve complete, non-estimated months', () => {
    expect(canClose(period())).toBe(true)
  })
  it('is refused with fewer than twelve months', () => {
    expect(canClose(period(11))).toBe(false)
  })
  it('is refused with an incomplete month (missing reading date)', () => {
    const file = period()
    delete file.months[3].common.endDate
    expect(canClose(file)).toBe(false)
  })
  it('is refused while the twelfth month is estimated', () => {
    const file = period()
    file.months[11].common.estimated = true
    expect(canClose(file)).toBe(false)
  })
  it('is refused while an earlier month is estimated', () => {
    const file = period()
    file.months[4].common.estimated = true
    expect(canClose(file)).toBe(false)
  })
  it('is refused with more than twelve months', () => {
    const file = period()
    file.months.push(completeMonth('2027-09'))
    expect(canClose(file)).toBe(false)
  })
  it('is refused once closed', () => {
    expect(canClose(period(12, { closedOn: '2027-10-11' }))).toBe(false)
  })
})

describe('closeChecks', () => {
  it('flags each condition separately', () => {
    const file = period(11, { closedOn: '2027-10-11' })
    delete file.months[3].common.endDate
    file.months[4].common.estimated = true
    expect(closeChecks(file)).toEqual({
      notClosed: false,
      twelveMonths: false,
      allComplete: false,
      noneEstimated: false,
    })
    expect(Object.values(closeChecks(period())).every(Boolean)).toBe(true)
  })
})

describe('monthsWithoutAdvance', () => {
  it('lists the months whose advance is 0', () => {
    const file = period(3)
    file.months[1].common.tenantBillAdvance = 70
    expect(monthsWithoutAdvance(file)).toEqual([file.months[0].month, file.months[2].month])
  })
})

describe('monthsWithoutAdvance when every advance is typed', () => {
  it('returns an empty list', () => {
    const file = period(2)
    file.months.forEach((m) => (m.common.tenantBillAdvance = 70))
    expect(monthsWithoutAdvance(file)).toEqual([])
  })
})

describe('canCreateNewPeriod', () => {
  it('is allowed with no previous file', () => {
    expect(canCreateNewPeriod(undefined)).toBe(true)
  })
  it('is refused while the previous twelfth month does not exist', () => {
    expect(canCreateNewPeriod(period(11))).toBe(false)
  })
  it('is allowed once the twelfth month is estimated or read', () => {
    const estimated = period(12)
    estimated.months[11].common.estimated = true
    expect(canCreateNewPeriod(estimated)).toBe(true)
    expect(canCreateNewPeriod(period(12))).toBe(true)
  })
})
