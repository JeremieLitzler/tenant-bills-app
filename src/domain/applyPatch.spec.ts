import { describe, expect, it } from 'vitest'

import { validPeriodJson } from '../../tests/helpers/periodFile'
import { applyPatch } from './applyPatch'
import type { PeriodFile } from './periodFile'

const file = () => validPeriodJson() as unknown as PeriodFile
const patch = (month: string | null, field: string, value: unknown) => ({
  period: '2026-2027',
  month,
  field,
  value,
})

describe('applyPatch', () => {
  it('sets a cell in its month only', () => {
    const f = file()
    applyPatch(f, patch('2026-10', 'internet.billedAmount', 21))
    expect(f.months[1].internet).toEqual({ billedAmount: 21 })
    expect(f.months[0].internet).toEqual({})
  })

  it('removes the key with null, but sets tenantBillAdvance to 0', () => {
    const f = file()
    applyPatch(f, patch('2026-09', 'internet.billedAmount', 21))
    applyPatch(f, patch('2026-09', 'common.tenantBillAdvance', 70))
    applyPatch(f, patch('2026-09', 'internet.billedAmount', null))
    applyPatch(f, patch('2026-09', 'common.tenantBillAdvance', null))
    expect(f.months[0].internet).toEqual({})
    expect(f.months[0].common).toEqual({ tenantBillAdvance: 0 })
  })

  it('sets and removes a top-level value', () => {
    const f = file()
    applyPatch(f, patch(null, 'closedOn', '2027-10-11'))
    expect(f.closedOn).toBe('2027-10-11')
    applyPatch(f, patch(null, 'closedOn', null))
    expect('closedOn' in f).toBe(false)
  })

  it('never creates a section object', () => {
    const f = file()
    applyPatch(f, patch('2026-09', 'unknown.key', 1))
    expect('unknown' in f.months[0]).toBe(false)
  })

  it('appends a month, never overwriting one', () => {
    const f = file()
    f.months = f.months.slice(0, 1)
    const next = validPeriodJson().months[1]
    applyPatch(f, patch('2026-10', 'month', next))
    applyPatch(f, patch('2026-10', 'month', { ...next, internet: { billedAmount: 1 } }))
    expect(f.months).toHaveLength(2)
    expect(f.months[1].internet).toEqual({})
  })

  it('ignores a month that is not after the last one', () => {
    const f = file()
    f.months = f.months.slice(0, 2)
    const earlier = { ...validPeriodJson().months[0], month: '2026-08' }
    applyPatch(f, patch('2026-08', 'month', earlier))
    expect(f.months.map((m) => m.month)).toEqual(['2026-09', '2026-10'])
  })
})
