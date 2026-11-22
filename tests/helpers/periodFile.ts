// A valid period file as plain JSON (docs/period-file.md), twelve empty months from September of
// the first year to August of the second. A fresh object on every call, so a test can break one
// rule without touching the next test.
export function validPeriodJson(periodId = '2026-2027') {
  const [firstYear, secondYear] = periodId.split('-').map(Number)
  const months = Array.from({ length: 12 }, (_, offset) => {
    const calendarMonth = ((8 + offset) % 12) + 1
    const year = calendarMonth >= 9 ? firstYear : secondYear
    return `${year}-${String(calendarMonth).padStart(2, '0')}`
  })
  return {
    schemaVersion: 2,
    periodName: periodId,
    monthlyTenantBillAdvance: 70,
    months: months.map((month) => ({
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

// A month with every input of docs/period-file.md ("Keys per section") typed.
export const completeMonth = (month: string) => ({
  month,
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
    tariffMode: 'base' as const,
    subscriptionUnit: 'month' as const,
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
