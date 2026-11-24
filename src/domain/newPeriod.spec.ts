import { describe, expect, it } from 'vitest'

import { checkNewPeriod } from './newPeriod'

const valid = {
  tenantName: ' Jane ',
  monthlyTenantBillAdvance: '80',
  heatPumpInvoiceEstimate: '0',
  startDate: '2026-09-15',
}

describe('checkNewPeriod', () => {
  it('returns the typed values, the name trimmed', () => {
    expect(checkNewPeriod(valid)).toEqual({
      values: {
        tenantName: 'Jane',
        monthlyTenantBillAdvance: 80,
        heatPumpInvoiceEstimate: 0,
        startDate: '2026-09-15',
      },
    })
  })

  it.each([
    ['tenantName', ' '],
    ['monthlyTenantBillAdvance', '0'],
    ['monthlyTenantBillAdvance', ''],
    ['heatPumpInvoiceEstimate', '-1'],
    ['startDate', ''],
    ['startDate', '2026-13-45'],
  ])('names %s when it is %j', (field, value) => {
    expect(checkNewPeriod({ ...valid, [field]: value })).toEqual({ invalid: field })
  })
})
