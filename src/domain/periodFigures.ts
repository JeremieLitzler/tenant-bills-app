// The period figures: every computed figure of a period, computed once from the file and only read
// by the views (docs/architecture.md, docs/reference/sheet-formulas.md). Vue-free.
// An amount whose inputs are missing is `undefined`, shown as "—", never a silent zero.
import type { MonthEntry, ReadonlyPeriodFile } from './periodFile'

export type Figure = number | undefined

export interface WaterConsumptionFigures {
  deltaMain: Figure
  deltaStudioUnsoftened: Figure
  deltaStudioSoftened: Figure
  landlordShare: Figure
  tenantShare: Figure
  bill: Figure
}

export interface WaterTreatmentFigures {
  landlordShare: Figure
  tenantShare: Figure
  bill: Figure
}

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

export interface MonthFigures {
  month: string
  waterConsumption: WaterConsumptionFigures
  waterTreatment: WaterTreatmentFigures
  electricity: ElectricityFigures
}

export interface PeriodFigures {
  months: MonthFigures[]
}

// Excel's ROUND to cents: half away from zero. The exponent notation avoids 1.005 * 100 = 100.4999.
function roundCents(value: number): number {
  const rounded = Number(`${Math.round(Number(`${Math.abs(value)}e2`))}e-2`)
  return value < 0 ? -rounded : rounded
}

// The operands, or undefined as soon as one is missing.
function all(...values: Figure[]): number[] | undefined {
  return values.every((value) => value !== undefined) ? (values as number[]) : undefined
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

// A water index is typed in litres; a delta is in m³.
function delta(current: Figure, previous: Figure): Figure {
  const operands = all(current, previous)
  return operands && (operands[0] - operands[1]) / 1000
}

function addBill(landlordShare: Figure, tenantShare: Figure): Figure {
  const shares = all(landlordShare, tenantShare)
  return shares && roundCents(shares[0] + shares[1])
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
  return Number.isNaN(days) || days < 0 ? undefined : days
}

type Register = 'Base' | 'Hc' | 'Hp'
const REGISTERS: Register[] = ['Base', 'Hc', 'Hp']

function electricityFigures(entry: MonthEntry, ratios?: { landlord: number; tenant: number }) {
  const e = entry.electricity
  // The keys of the inactive mode are never read: their deltas are 0 and their prices unused.
  const active: Register[] = e.tariffMode === 'hchp' ? ['Hc', 'Hp'] : ['Base']
  const deltas = (meter: 'main' | 'studio') =>
    Object.fromEntries(
      REGISTERS.map((kind) => {
        if (!active.includes(kind)) return [kind, 0]
        const operands = all(e[`${meter}${kind}`], e[`${meter}${kind}Previous`])
        return [kind, operands && operands[0] - operands[1]]
      }),
    ) as Record<Register, Figure>
  const main = deltas('main')
  const studio = deltas('studio')
  const units = subscriptionUnits(entry)

  const share = (deltaOf: Record<Register, Figure>, ratio: number | undefined): Figure => {
    if (!e.tariffMode) return undefined
    const energy = active.map((kind) => all(deltaOf[kind], e.excisePerKwh, e[`kwhPrice${kind}`]))
    const fixed = all(units, e.subscriptionPerUnit, e.ctaTax, ratio, e.vat)
    if (!fixed || energy.some((terms) => !terms)) return undefined
    const [count, perUnit, cta, occupantRatio, vat] = fixed
    const kwhCost = sum(
      energy.map((terms) => {
        const [kwh, excise, price] = terms!
        return kwh * (excise + price)
      }),
    )
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

function monthFigures(entry: MonthEntry): MonthFigures {
  const { landlordOccupants, tenantOccupants } = entry.common
  const water = entry.waterConsumption
  const treatment = entry.waterTreatment

  const deltaMain = delta(water.mainMeter, water.mainMeterPrevious)
  const deltaStudioUnsoftened = delta(
    water.studioUnsoftenedMeter,
    water.studioUnsoftenedMeterPrevious,
  )
  const deltaStudioSoftened = delta(water.studioSoftenedMeter, water.studioSoftenedMeterPrevious)
  const studioVolume = all(deltaStudioUnsoftened, deltaStudioSoftened)?.reduce((a, b) => a + b)

  const occupants = all(landlordOccupants, tenantOccupants)
  const totalOccupants = occupants && occupants[0] + occupants[1]
  // No occupant at all has no ratio: uncomputable rather than a division by zero.
  const ratios =
    occupants && totalOccupants
      ? { landlord: occupants[0] / totalOccupants, tenant: occupants[1] / totalOccupants }
      : undefined

  const prices = all(
    water.pricePerM3,
    water.resourceWithdrawalFee,
    water.drinkingWaterFee,
    water.networkPerformanceFee,
  )
  const consumptionShare = (volume: Figure, ratio: number | undefined): Figure => {
    if (!prices || volume === undefined || ratio === undefined) return undefined
    if (water.subscription === undefined || water.vat === undefined) return undefined
    return roundCents((volume * sum(prices) + water.subscription * ratio) * water.vat)
  }

  const collection = all(
    treatment.collectionConsumptionDistributor,
    treatment.collectionConsumptionCommunity,
    treatment.sanitationPerformance,
  )
  const collectionSubscription = all(
    treatment.monthlySubscriptionDistributor,
    treatment.monthlySubscriptionCommunity,
  )
  const treatmentShare = (volume: Figure, ratio: number | undefined): Figure => {
    if (!collection || !collectionSubscription || volume === undefined) return undefined
    if (ratio === undefined || treatment.vat === undefined) return undefined
    return roundCents(
      (sum(collection) * volume + sum(collectionSubscription) * ratio) * treatment.vat,
    )
  }

  const waterLandlord = consumptionShare(deltaMain, ratios?.landlord)
  const waterTenant = consumptionShare(studioVolume, ratios?.tenant)
  const treatmentLandlord = treatmentShare(
    deltaMain !== undefined && studioVolume !== undefined ? deltaMain - studioVolume : undefined,
    ratios?.landlord,
  )
  const treatmentTenant = treatmentShare(studioVolume, ratios?.tenant)

  return {
    month: entry.month,
    waterConsumption: {
      deltaMain,
      deltaStudioUnsoftened,
      deltaStudioSoftened,
      landlordShare: waterLandlord,
      tenantShare: waterTenant,
      bill: addBill(waterLandlord, waterTenant),
    },
    waterTreatment: {
      landlordShare: treatmentLandlord,
      tenantShare: treatmentTenant,
      bill: addBill(treatmentLandlord, treatmentTenant),
    },
    electricity: electricityFigures(entry, ratios),
  }
}

export function computePeriodFigures(file: ReadonlyPeriodFile): PeriodFigures {
  return { months: file.months.map(monthFigures) }
}
