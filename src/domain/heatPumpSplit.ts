// The annual heat pump amount split over a period (docs/reference/sheet-formulas.md, "Heat pump
// maintenance"): ROUND(annual / 12, 2) for the first eleven months, the remainder in the twelfth.
export function splitHeatPumpAnnual(annual: number): number[] {
  const monthly = Math.round((annual * 100) / 12) / 100
  const last = Math.round((annual - monthly * 11) * 100) / 100
  return [...Array(11).fill(monthly), last]
}
