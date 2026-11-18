import type { MonthEntry } from '../periodFile'
import { addBill, allDefined, roundCents, type Figure, type OccupantRatios } from './figureMath'

export interface ElectricityFigures {
  deltaMainBase: Figure
  deltaMainHc: Figure
  deltaMainHp: Figure
  deltaStudioBase: Figure
  deltaStudioHc: Figure
  deltaStudioHp: Figure
  subscriptionUnits: Figure
  landlordShare: Figure
  tenantShare: Figure
  bill: Figure
}

const DAY_MS = 86_400_000

// Days between "Du" and "Au" (ISO dates), or one unit for a per-month subscription.
function subscriptionUnits(entry: MonthEntry): Figure {
  if (entry.electricity.subscriptionUnit === 'month') return 1
  if (entry.electricity.subscriptionUnit !== 'day') return undefined
  const { startDate, endDate } = entry.common
  if (!startDate || !endDate) return undefined
  const days = (Date.parse(endDate) - Date.parse(startDate)) / DAY_MS
  // A negative count is an end date before the start date: uncomputable, not a negative bill.
  // shortcut: silent dash until validatePeriodFile reports it, see #121.
  return Number.isNaN(days) || days < 0 ? undefined : days
}

type ElectricityTariff = 'Base' | 'Hc' | 'Hp'
const ELECTRICITY_TARIFFS: ElectricityTariff[] = ['Base', 'Hc', 'Hp']

export function electricityFigures(entry: MonthEntry, ratios?: OccupantRatios): ElectricityFigures {
  const electricityInputs = entry.electricity
  // Without a tariff mode no register is known to apply: everything that depends on it is "—".
  // shortcut: silent dash until validatePeriodFile reports it, see #122.
  const active: ElectricityTariff[] | undefined = !electricityInputs.tariffMode
    ? undefined
    : electricityInputs.tariffMode === 'hchp'
      ? ['Hc', 'Hp']
      : ['Base']
  // The keys of the inactive mode are never read: their deltas are 0 and their prices unused.
  const deltas = (meter: 'main' | 'studio') =>
    Object.fromEntries(
      ELECTRICITY_TARIFFS.map((kind) => {
        if (!active) return [kind, undefined]
        if (!active.includes(kind)) return [kind, 0]
        const operands = allDefined(
          electricityInputs[`${meter}${kind}`],
          electricityInputs[`${meter}${kind}Previous`],
        )
        return [kind, operands && operands[0] - operands[1]]
      }),
    ) as Record<ElectricityTariff, Figure>
  const main = deltas('main')
  const studio = deltas('studio')
  const units = subscriptionUnits(entry)

  const share = (deltaOf: Record<ElectricityTariff, Figure>, ratio: number | undefined): Figure => {
    if (!active) return undefined
    const fixed = allDefined(
      units,
      electricityInputs.subscriptionPerUnit,
      electricityInputs.ctaTax,
      ratio,
      electricityInputs.vat,
    )
    if (!fixed) return undefined
    const [count, perUnit, cta, occupantRatio, vat] = fixed
    let kwhCost = 0
    for (const kind of active) {
      const terms = allDefined(
        deltaOf[kind],
        electricityInputs.excisePerKwh,
        electricityInputs[`kwhPrice${kind}`],
      )
      if (!terms) return undefined
      const [kwh, excise, price] = terms
      kwhCost += kwh * (excise + price)
    }
    return roundCents((kwhCost + (count * perUnit + cta) * occupantRatio) * vat)
  }
  const landlordShare = share(main, ratios?.landlord)
  const tenantShare = share(studio, ratios?.tenant)
  return {
    deltaMainBase: main.Base,
    deltaMainHc: main.Hc,
    deltaMainHp: main.Hp,
    deltaStudioBase: studio.Base,
    deltaStudioHc: studio.Hc,
    deltaStudioHp: studio.Hp,
    subscriptionUnits: units,
    landlordShare,
    tenantShare,
    bill: addBill(landlordShare, tenantShare),
  }
}
