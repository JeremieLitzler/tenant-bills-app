import { describe, expect, it } from 'vitest'

import { validPeriodJson } from '@tests/helpers/periodFile'
import { applyOffer } from './applyOffer'
import type { PeriodFile } from './periodFile'

const file = () => validPeriodJson() as unknown as PeriodFile

describe('applyOffer', () => {
  it('offers every later month for an inheritable value', () => {
    const offer = applyOffer(file(), '2026-11', 'waterConsumption.pricePerM3', 4)
    expect(offer?.kind).toBe('inherited')
    expect(offer?.patches.map((p) => p.month)).toEqual([
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07',
      '2027-08',
    ])
    expect(
      offer?.patches.every((p) => p.field === 'waterConsumption.pricePerM3' && p.value === 4),
    ).toBe(true)
  })

  it('offers the next month previous index for a current index', () => {
    expect(applyOffer(file(), '2026-11', 'electricity.mainHc', 120)).toEqual({
      kind: 'index',
      patches: [{ month: '2026-12', field: 'electricity.mainHcPrevious', value: 120 }],
    })
  })

  it('offers nothing for anything else, or for the last month', () => {
    expect(applyOffer(file(), '2026-11', 'common.tenantBillAdvance', 70)).toBeUndefined()
    expect(applyOffer(file(), '2026-11', 'electricity.mainHcPrevious', 1)).toBeUndefined()
    expect(applyOffer(file(), '2027-08', 'waterConsumption.pricePerM3', 4)).toBeUndefined()
    expect(applyOffer(file(), '2027-08', 'electricity.mainHc', 1)).toBeUndefined()
  })
})
