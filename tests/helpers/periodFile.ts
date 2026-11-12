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
    schemaVersion: 1,
    periodName: periodId,
    settings: { monthlyTenantBillAdvance: 70 },
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
