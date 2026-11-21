// Whether each section of a month, and the whole month, is complete (docs/period-file.md,
// "Keys per section"). A key is present when it is not `undefined`: `0` counts. Vue-free.
import type { MonthEntry, SectionName } from './periodFile'

export interface MonthCompleteness {
  sections: Record<SectionName, boolean>
  complete: boolean
}

const WATER_CONSUMPTION = [
  'mainMeter',
  'studioUnsoftenedMeter',
  'studioSoftenedMeter',
  'mainMeterPrevious',
  'studioUnsoftenedMeterPrevious',
  'studioSoftenedMeterPrevious',
  'pricePerM3',
  'resourceWithdrawalFee',
  'drinkingWaterFee',
  'networkPerformanceFee',
  'subscription',
  'vat',
]

const WATER_TREATMENT = [
  'monthlySubscriptionDistributor',
  'monthlySubscriptionCommunity',
  'collectionConsumptionDistributor',
  'collectionConsumptionCommunity',
  'sanitationPerformance',
  'vat',
]

const ELECTRICITY_COMMON = [
  'tariffMode',
  'subscriptionUnit',
  'excisePerKwh',
  'subscriptionPerUnit',
  'ctaTax',
  'vat',
]

const ELECTRICITY_REGISTERS = {
  base: ['mainBase', 'studioBase', 'mainBasePrevious', 'studioBasePrevious', 'kwhPriceBase'],
  hchp: [
    'mainHc',
    'mainHp',
    'studioHc',
    'studioHp',
    'mainHcPrevious',
    'mainHpPrevious',
    'studioHcPrevious',
    'studioHpPrevious',
    'kwhPriceHc',
    'kwhPriceHp',
  ],
}

type Inputs = Record<string, unknown>

const has = (inputs: Inputs | undefined, keys: string[]) =>
  keys.every((key) => inputs?.[key] !== undefined)

function softenerComplete(inputs: Inputs | undefined): boolean {
  if (!inputs || inputs.quantity === undefined || inputs.quantity === 0) return true
  return has(inputs, ['unitPrice', 'description'])
}

function electricityComplete(inputs: Inputs | undefined): boolean {
  const mode = inputs?.tariffMode as keyof typeof ELECTRICITY_REGISTERS | undefined
  if (!mode || !(mode in ELECTRICITY_REGISTERS)) return false
  return has(inputs, [...ELECTRICITY_COMMON, ...ELECTRICITY_REGISTERS[mode]])
}

export function monthCompleteness(entry: MonthEntry): MonthCompleteness {
  const sections: Record<SectionName, boolean> = {
    common: has(entry.common as unknown as Inputs, [
      'startDate',
      'endDate',
      'landlordOccupants',
      'tenantOccupants',
      'tenantBillAdvance',
    ]),
    waterConsumption: has(entry.waterConsumption as Inputs, WATER_CONSUMPTION),
    waterTreatment: has(entry.waterTreatment as Inputs, WATER_TREATMENT),
    waterSoftener: softenerComplete(entry.waterSoftener as Inputs),
    electricity: electricityComplete(entry.electricity as Inputs),
    internet: has(entry.internet as Inputs, ['billedAmount']),
    heatPumpMaintenance: has(entry.heatPumpMaintenance as Inputs, ['billedAmount']),
  }
  return { sections, complete: Object.values(sections).every(Boolean) }
}
