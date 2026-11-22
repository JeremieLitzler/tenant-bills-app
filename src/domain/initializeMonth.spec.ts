import { describe, expect, it } from 'vitest'

import { monthEntry } from './monthEntry.testHelper'
import { initializeMonth } from './initializeMonth'
import type { MonthEntry, PeriodFile } from './periodFile'

const month = (name: string, over: Partial<MonthEntry> = {}) => monthEntry({ month: name, ...over })

function file(months: MonthEntry[], heatPumpInvoiceEstimate?: number): PeriodFile {
  return {
    schemaVersion: 2,
    periodName: '2026-2027',
    monthlyTenantBillAdvance: 70,
    heatPumpInvoiceEstimate,
    months,
  } as PeriodFile
}

const first = month('2026-09', {
  common: {
    startDate: '2026-09-12',
    endDate: '2026-10-11',
    tenantOccupants: 1,
    tenantBillAdvance: 70,
  },
  waterConsumption: { mainMeterPrevious: 100, mainMeter: 130, pricePerM3: 1.05 },
  waterSoftener: { quantity: 2 },
  electricity: { tariffMode: 'base', mainBasePrevious: 10, mainBase: 25.5, ctaTax: 2.34 },
  internet: { billedAmount: 20.99 },
  heatPumpMaintenance: { billedAmount: 12.83 },
})

describe('initializeMonth', () => {
  it('copies inherited values, sets previous indexes and the dates', () => {
    const next = initializeMonth(file([first], 154))!
    expect(next.month).toBe('2026-10')
    expect(next.common).toEqual({
      startDate: '2026-10-11',
      endDate: '2026-11-15', // the 15th, a Sunday
      tenantOccupants: 1,
      tenantBillAdvance: 0,
    })
    expect(next.waterConsumption).toEqual({ mainMeterPrevious: 130, pricePerM3: 1.05 })
    expect(next.electricity).toEqual({ tariffMode: 'base', mainBasePrevious: 25.5, ctaTax: 2.34 })
    expect(next.internet).toEqual({ billedAmount: 20.99 })
    expect(next.waterSoftener).toEqual({})
    expect(next.heatPumpMaintenance).toEqual({ billedAmount: 12.83 })
  })

  it('suggests the Sunday before when the 15th is Monday to Wednesday', () => {
    const f = file([month('2026-12', { common: { endDate: '2026-12-13', tenantBillAdvance: 0 } })])
    // 2027-01-15 is a Friday; 2027-02-15 a Monday > Sunday 2027-02-14
    expect(initializeMonth(f)!.common.endDate).toBe('2027-01-15')
    const g = file([month('2027-01', { common: { endDate: '2027-01-15', tenantBillAdvance: 0 } })])
    expect(initializeMonth(g)!.common.endDate).toBe('2027-02-14')
  })

  it('fills the heat pump share, the remainder in the twelfth month', () => {
    const months = Array.from({ length: 11 }, (_, i) =>
      month(`2026-${String(i + 1).padStart(2, '0')}`, {
        common: { endDate: '2026-11-15', tenantBillAdvance: 0 },
      }),
    )
    const twelfth = initializeMonth(file(months, 154))!
    expect(twelfth.heatPumpMaintenance.billedAmount).toBe(12.87)
    expect(initializeMonth(file([first], 154))!.heatPumpMaintenance.billedAmount).toBe(12.83)
  })

  it('offers no next month after the twelfth', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => month(`m${i}`))
    expect(initializeMonth(file(twelve))).toBeUndefined()
  })

  describe('the twelfth month', () => {
    function eleven(over: Partial<MonthEntry>): PeriodFile {
      const filler = Array.from({ length: 10 }, (_, i) => month(`2026-0${i}`))
      return file([...filler, month('2027-07', over)], 154)
    }
    const dates = { endDate: '2027-08-15', tenantBillAdvance: 0 }

    it('estimates indexes from the previous period twelfth month and sets common.estimated', () => {
      const july = month('2027-07', {
        common: dates,
        waterConsumption: { mainMeterPrevious: 1000, mainMeter: 1100 },
        electricity: { tariffMode: 'base', mainBasePrevious: 50, mainBase: 60 },
      })
      const prevAugust = month('2026-08', {
        waterConsumption: { mainMeterPrevious: 500, mainMeter: 540 },
        electricity: {
          tariffMode: 'hchp',
          mainHcPrevious: 10,
          mainHc: 12,
          mainHpPrevious: 20,
          mainHp: 25,
        },
      })
      const f = file([...Array.from({ length: 10 }, (_, i) => month(`2026-0${i}`)), july], 154)
      const next = initializeMonth(f, prevAugust)!
      expect(next.common.estimated).toBe(true)
      expect(next.waterConsumption.mainMeterPrevious).toBe(1100)
      expect(next.waterConsumption.mainMeter).toBe(1140)
      // previous August delta 2 + 5 = 7 kWh into Base
      expect(next.electricity.mainBase).toBe(67)
    })

    it('falls back to the eleventh month delta and splits 30/70 in hchp', () => {
      const july = month('2027-07', {
        common: dates,
        waterConsumption: { mainMeterPrevious: 1000, mainMeter: 1100 },
        electricity: {
          tariffMode: 'hchp',
          mainHcPrevious: 0,
          mainHc: 30,
          mainHpPrevious: 0,
          mainHp: 70,
        },
      })
      const next = initializeMonth(eleven(july))!
      expect(next.waterConsumption.mainMeter).toBe(1200)
      expect(next.electricity.mainHc).toBe(60)
      expect(next.electricity.mainHp).toBe(140)
    })

    it('leaves an index empty when no delta can be worked out', () => {
      const next = initializeMonth(eleven(month('2027-07', { common: dates })))!
      expect(next.common.estimated).toBe(true)
      expect(next.waterConsumption.mainMeter).toBeUndefined()
    })
  })
})
