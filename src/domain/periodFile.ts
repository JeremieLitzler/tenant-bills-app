// The period file as stored in the data repo (docs/period-file.md, ADR 0005). Inputs only: every
// delta, share, bill and balance is computed. Vue-free.

export interface CommonInputs {
  readingDate?: string
  readingDatePrevious?: string
  landlordOccupants?: number
  tenantOccupants?: number
  tenantBillAdvance: number
}

export interface WaterConsumptionInputs {
  mainMeter?: number
  studioUnsoftenedMeter?: number
  studioSoftenedMeter?: number
  mainMeterPrevious?: number
  studioUnsoftenedMeterPrevious?: number
  studioSoftenedMeterPrevious?: number
  pricePerM3?: number
  resourceWithdrawalFee?: number
  drinkingWaterFee?: number
  networkPerformanceFee?: number
  subscription?: number
  vat?: number
}

export interface WaterTreatmentInputs {
  collectionConsumptionDistributor?: number
  collectionConsumptionCommunity?: number
  sanitationPerformance?: number
  vat?: number
}

export interface WaterSoftenerInputs {
  description?: string
  quantity?: number
  unitPrice?: number
}

export interface ElectricityInputs {
  tariffMode?: 'base' | 'hchp'
  subscriptionUnit?: 'day' | 'month'
  mainBase?: number
  mainHc?: number
  mainHp?: number
  studioBase?: number
  studioHc?: number
  studioHp?: number
  mainBasePrevious?: number
  mainHcPrevious?: number
  mainHpPrevious?: number
  studioBasePrevious?: number
  studioHcPrevious?: number
  studioHpPrevious?: number
  excisePerKwh?: number
  kwhPriceBase?: number
  kwhPriceHc?: number
  kwhPriceHp?: number
  subscriptionPerUnit?: number
  ctaTax?: number
  vat?: number
}

export interface InternetInputs {
  billedAmount?: number
}

export interface HeatPumpMaintenanceInputs {
  billedAmount?: number
}

export interface SectionInputs {
  common: CommonInputs
  waterConsumption: WaterConsumptionInputs
  waterTreatment: WaterTreatmentInputs
  waterSoftener: WaterSoftenerInputs
  electricity: ElectricityInputs
  internet: InternetInputs
  heatPumpMaintenance: HeatPumpMaintenanceInputs
}

export type SectionName = keyof SectionInputs

export type MonthEntry = { month: string } & SectionInputs

export interface PeriodSettings {
  monthlyTenantBillAdvance: number
  closedOn?: string
}

export interface PeriodFile {
  schemaVersion: number
  periodName: string
  settings: PeriodSettings
  months: MonthEntry[]
}

// What the functions that only read a period take, so the read-only `file` of `usePeriod` fits
// (the months array is the only part TypeScript refuses to pass as mutable).
export type ReadonlyPeriodFile = Omit<PeriodFile, 'months'> & {
  readonly months: readonly MonthEntry[]
}

// "inherited": an untyped key takes the previous month's value. "not-inherited": an untyped key is
// empty. The `...Previous` index keys are "not-inherited" from their own key, but the resolver
// derives them from the previous month's current index (see `resolveAtIndex` in inheritance.ts).
export type Inheritance = 'inherited' | 'not-inherited'

type Catalogue = { [S in SectionName]: Record<keyof SectionInputs[S], Inheritance> }

export const FIELD_CATALOGUE: Catalogue = {
  common: {
    readingDate: 'not-inherited',
    readingDatePrevious: 'not-inherited',
    landlordOccupants: 'inherited',
    tenantOccupants: 'inherited',
    tenantBillAdvance: 'not-inherited',
  },
  waterConsumption: {
    mainMeter: 'inherited',
    studioUnsoftenedMeter: 'inherited',
    studioSoftenedMeter: 'inherited',
    mainMeterPrevious: 'not-inherited',
    studioUnsoftenedMeterPrevious: 'not-inherited',
    studioSoftenedMeterPrevious: 'not-inherited',
    pricePerM3: 'inherited',
    resourceWithdrawalFee: 'inherited',
    drinkingWaterFee: 'inherited',
    networkPerformanceFee: 'inherited',
    subscription: 'inherited',
    vat: 'inherited',
  },
  waterTreatment: {
    collectionConsumptionDistributor: 'inherited',
    collectionConsumptionCommunity: 'inherited',
    sanitationPerformance: 'inherited',
    vat: 'inherited',
  },
  waterSoftener: {
    description: 'not-inherited',
    quantity: 'not-inherited',
    unitPrice: 'not-inherited',
  },
  electricity: {
    tariffMode: 'inherited',
    subscriptionUnit: 'inherited',
    mainBase: 'inherited',
    mainHc: 'inherited',
    mainHp: 'inherited',
    studioBase: 'inherited',
    studioHc: 'inherited',
    studioHp: 'inherited',
    mainBasePrevious: 'not-inherited',
    mainHcPrevious: 'not-inherited',
    mainHpPrevious: 'not-inherited',
    studioBasePrevious: 'not-inherited',
    studioHcPrevious: 'not-inherited',
    studioHpPrevious: 'not-inherited',
    excisePerKwh: 'inherited',
    kwhPriceBase: 'inherited',
    kwhPriceHc: 'inherited',
    kwhPriceHp: 'inherited',
    subscriptionPerUnit: 'inherited',
    ctaTax: 'inherited',
    vat: 'inherited',
  },
  internet: { billedAmount: 'inherited' },
  heatPumpMaintenance: { billedAmount: 'not-inherited' },
}

// A `...Previous` key takes the value of its current key (`resolveAtIndex` casts for that), so the
// two must have the same type. This fails `vue-tsc` if a meter pair ever drifts apart.
type PairsAgree<S> = {
  [K in keyof S & `${string}Previous`]: K extends `${infer C}Previous`
    ? C extends keyof S
      ? [S[K]] extends [S[C]]
        ? [S[C]] extends [S[K]]
          ? true
          : false
        : false
      : true
    : true
}[keyof S & `${string}Previous`]
type MustBeTrue<T extends true> = T
export type MeterPairsAgree = [
  MustBeTrue<PairsAgree<WaterConsumptionInputs>>,
  MustBeTrue<PairsAgree<ElectricityInputs>>,
]
