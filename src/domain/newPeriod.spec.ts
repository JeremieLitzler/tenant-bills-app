import { describe, expect, it } from 'vitest'

import { checkNewPeriod, newPeriodFile } from './newPeriod'

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

describe('newPeriodFile heat pump', () => {
  const values = { tenantName: 'Jane', monthlyTenantBillAdvance: 80, startDate: '2026-09-15' }

  it('fills the first month with the first share and keeps the annual estimate at the top level', () => {
    const file = newPeriodFile('2026-2027', { ...values, heatPumpInvoiceEstimate: 154 })
    expect(file.months).toHaveLength(1)
    expect(file.months[0].heatPumpMaintenance.billedAmount).toBe(12.83)
    expect(file.heatPumpInvoiceEstimate).toBe(154)
  })

  it('leaves the month without a heat pump amount when the estimate is 0', () => {
    const file = newPeriodFile('2026-2027', { ...values, heatPumpInvoiceEstimate: 0 })
    expect(file.months[0].heatPumpMaintenance).toEqual({})
  })
})
