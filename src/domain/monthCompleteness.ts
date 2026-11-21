// Whether each section of a month, and the whole month, is complete (docs/period-file.md,
// "Keys per section"). A key is present when it is not `undefined`: `0` counts. Vue-free.
import type {
  CommonInputs,
  ElectricityInputs,
  MonthEntry,
  SectionName,
  WaterConsumptionInputs,
  WaterSoftenerInputs,
  WaterTreatmentInputs,
} from './periodFile'

export interface MonthCompleteness {
  sections: Record<SectionName, boolean>
  complete: boolean
}

// Typed by `keyof`, so a renamed or misspelled key fails `vue-tsc` instead of making a section
// never complete.
const COMMON: (keyof CommonInputs)[] = [
  'startDate',
  'endDate',
  'landlordOccupants',
  'tenantOccupants',
  'tenantBillAdvance',
]

const WATER_CONSUMPTION: (keyof WaterConsumptionInputs)[] = [
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

const WATER_TREATMENT: (keyof WaterTreatmentInputs)[] = [
  'monthlySubscriptionDistributor',
  'monthlySubscriptionCommunity',
  'collectionConsumptionDistributor',
  'collectionConsumptionCommunity',
  'sanitationPerformance',
  'vat',
]

const ELECTRICITY_COMMON: (keyof ElectricityInputs)[] = [
  'tariffMode',
  'subscriptionUnit',
  'excisePerKwh',
  'subscriptionPerUnit',
  'ctaTax',
  'vat',
]

const ELECTRICITY_REGISTERS: Record<'base' | 'hchp', (keyof ElectricityInputs)[]> = {
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

const hasAll = <T extends object>(inputs: T | undefined, keys: (keyof T)[]) =>
  keys.every((key) => inputs?.[key] !== undefined)

function softenerComplete(inputs: WaterSoftenerInputs | undefined): boolean {
  if (!inputs || inputs.quantity === undefined || inputs.quantity === 0) return true
  return hasAll(inputs, ['unitPrice', 'description'])
}

function electricityComplete(inputs: ElectricityInputs | undefined): boolean {
  const mode = inputs?.tariffMode
  if (!mode || !(mode in ELECTRICITY_REGISTERS)) return false
  return hasAll(inputs, [...ELECTRICITY_COMMON, ...ELECTRICITY_REGISTERS[mode]])
}

export function monthCompleteness(entry: MonthEntry): MonthCompleteness {
  const sections: Record<SectionName, boolean> = {
    common: hasAll(entry.common, COMMON),
    waterConsumption: hasAll(entry.waterConsumption, WATER_CONSUMPTION),
    waterTreatment: hasAll(entry.waterTreatment, WATER_TREATMENT),
    waterSoftener: softenerComplete(entry.waterSoftener),
    electricity: electricityComplete(entry.electricity),
    internet: hasAll(entry.internet, ['billedAmount']),
    heatPumpMaintenance: hasAll(entry.heatPumpMaintenance, ['billedAmount']),
  }
  return { sections, complete: Object.values(sections).every(Boolean) }
}
