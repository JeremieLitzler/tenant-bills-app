import { describe, expect, it } from 'vitest'

import { monthCompleteness } from './monthCompleteness'
import type { MonthEntry } from './periodFile'

const complete = (): MonthEntry => ({
  month: '2026-10',
  common: {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    landlordOccupants: 1,
    tenantOccupants: 2,
    tenantBillAdvance: 0,
  },
  waterConsumption: {
    mainMeter: 1,
    studioUnsoftenedMeter: 1,
    studioSoftenedMeter: 1,
    mainMeterPrevious: 0,
    studioUnsoftenedMeterPrevious: 0,
    studioSoftenedMeterPrevious: 0,
    pricePerM3: 1,
    resourceWithdrawalFee: 1,
    drinkingWaterFee: 1,
    networkPerformanceFee: 1,
    subscription: 1,
    vat: 1.055,
  },
  waterTreatment: {
    monthlySubscriptionDistributor: 1,
    monthlySubscriptionCommunity: 1,
    collectionConsumptionDistributor: 1,
    collectionConsumptionCommunity: 1,
    sanitationPerformance: 1,
    vat: 1.1,
  },
  waterSoftener: {},
  electricity: {
    tariffMode: 'base',
    subscriptionUnit: 'month',
    excisePerKwh: 1,
    subscriptionPerUnit: 1,
    ctaTax: 1,
    vat: 1.2,
    mainBase: 1,
    studioBase: 1,
    mainBasePrevious: 0,
    studioBasePrevious: 0,
    kwhPriceBase: 1,
  },
  internet: { billedAmount: 30 },
  heatPumpMaintenance: { billedAmount: 0 },
})

describe('monthCompleteness', () => {
  it('reports a full month complete, with 0 counting as present', () => {
    const result = monthCompleteness(complete())
    expect(result.complete).toBe(true)
    expect(Object.values(result.sections).every(Boolean)).toBe(true)
  })

  it.each([
    ['common', (m: MonthEntry) => delete m.common.endDate],
    ['waterConsumption', (m: MonthEntry) => delete m.waterConsumption.vat],
    ['waterTreatment', (m: MonthEntry) => delete m.waterTreatment.sanitationPerformance],
    ['electricity', (m: MonthEntry) => delete m.electricity.ctaTax],
    ['internet', (m: MonthEntry) => delete m.internet.billedAmount],
    ['heatPumpMaintenance', (m: MonthEntry) => delete m.heatPumpMaintenance.billedAmount],
  ] as const)(
    'flags %s incomplete when a key is missing, and the month with it',
    (section, strip) => {
      const entry = complete()
      strip(entry)
      const result = monthCompleteness(entry)
      expect(result.sections[section]).toBe(false)
      expect(result.complete).toBe(false)
    },
  )

  it('does not require estimated', () => {
    const entry = complete()
    entry.common.estimated = true
    expect(monthCompleteness(entry).sections.common).toBe(true)
  })

  it('requires only the registers of the tariff mode', () => {
    const entry = complete()
    entry.electricity.mainHc = undefined
    expect(monthCompleteness(entry).sections.electricity).toBe(true)

    delete entry.electricity.kwhPriceBase
    expect(monthCompleteness(entry).sections.electricity).toBe(false)

    const hchp = complete()
    hchp.electricity.tariffMode = 'hchp'
    expect(monthCompleteness(hchp).sections.electricity).toBe(false)
    Object.assign(hchp.electricity, {
      mainHc: 1,
      mainHp: 1,
      studioHc: 1,
      studioHp: 1,
      mainHcPrevious: 0,
      mainHpPrevious: 0,
      studioHcPrevious: 0,
      studioHpPrevious: 0,
      kwhPriceHc: 1,
      kwhPriceHp: 1,
    })
    expect(monthCompleteness(hchp).sections.electricity).toBe(true)
  })

  it('is incomplete electricity without a tariff mode', () => {
    const entry = complete()
    delete entry.electricity.tariffMode
    expect(monthCompleteness(entry).sections.electricity).toBe(false)
  })

  it('treats the water softener as complete when empty or at quantity 0', () => {
    const entry = complete()
    entry.waterSoftener = { quantity: 0 }
    expect(monthCompleteness(entry).sections.waterSoftener).toBe(true)
  })

  it('needs unit price and description for a non-zero softener quantity', () => {
    const entry = complete()
    entry.waterSoftener = { quantity: 2 }
    expect(monthCompleteness(entry).sections.waterSoftener).toBe(false)
    entry.waterSoftener = { quantity: 2, unitPrice: 5 }
    expect(monthCompleteness(entry).sections.waterSoftener).toBe(false)
    entry.waterSoftener = { quantity: 2, unitPrice: 5, description: 'salt' }
    expect(monthCompleteness(entry).sections.waterSoftener).toBe(true)
  })
})
