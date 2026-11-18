import { ELECTRICITY_TARIFFS, TARIFFS_BY_MODE, type ElectricityTariff } from '../electricityTariffs'
import type { ElectricityInputs, MonthEntry } from '../periodFile'
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

type TariffDeltas = Record<ElectricityTariff, Figure>

// The tariffs the month's mode reads. Without a mode no tariff is known to apply: everything that
// depends on it is "—". shortcut: silent dash until validatePeriodFile reports it, see #122.
function activeTariffs(inputs: ElectricityInputs): readonly ElectricityTariff[] | undefined {
  if (!inputs.tariffMode) return undefined
  return TARIFFS_BY_MODE[inputs.tariffMode]
}

// The keys of the inactive mode are never read: their deltas are 0 and their prices unused.
function tariffDeltas(
  inputs: ElectricityInputs,
  meter: 'main' | 'studio',
  active: readonly ElectricityTariff[] | undefined,
): TariffDeltas {
  return Object.fromEntries(
    ELECTRICITY_TARIFFS.map((tariff) => {
      if (!active) return [tariff, undefined]
      if (!active.includes(tariff)) return [tariff, 0]
      const operands = allDefined(inputs[`${meter}${tariff}`], inputs[`${meter}${tariff}Previous`])
      return [tariff, operands && operands[0] - operands[1]]
    }),
  ) as TariffDeltas
}

function electricityShare(
  inputs: ElectricityInputs,
  active: readonly ElectricityTariff[] | undefined,
  deltas: TariffDeltas,
  units: Figure,
  ratio: number | undefined,
): Figure {
  if (!active) return undefined
  const fixed = allDefined(units, inputs.subscriptionPerUnit, inputs.ctaTax, ratio, inputs.vat)
  if (!fixed) return undefined
  const [count, perUnit, cta, occupantRatio, vat] = fixed
  let kwhCost = 0
  for (const tariff of active) {
    const terms = allDefined(deltas[tariff], inputs.excisePerKwh, inputs[`kwhPrice${tariff}`])
    if (!terms) return undefined
    const [kwh, excise, price] = terms
    kwhCost += kwh * (excise + price)
  }
  return roundCents((kwhCost + (count * perUnit + cta) * occupantRatio) * vat)
}

export function electricityFigures(entry: MonthEntry, ratios?: OccupantRatios): ElectricityFigures {
  const inputs = entry.electricity
  const active = activeTariffs(inputs)
  const main = tariffDeltas(inputs, 'main', active)
  const studio = tariffDeltas(inputs, 'studio', active)
  const units = subscriptionUnits(entry)
  const landlordShare = electricityShare(inputs, active, main, units, ratios?.landlord)
  const tenantShare = electricityShare(inputs, active, studio, units, ratios?.tenant)
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
