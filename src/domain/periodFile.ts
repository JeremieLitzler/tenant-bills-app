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

// "I": an untyped key takes the previous month's value. "N": an untyped key is empty.
export type Inheritance = 'I' | 'N'

type Catalogue = { [S in SectionName]: Record<keyof SectionInputs[S], Inheritance> }

export const FIELD_CATALOGUE: Catalogue = {
  common: {
    readingDate: 'N',
    readingDatePrevious: 'N',
    landlordOccupants: 'I',
    tenantOccupants: 'I',
    tenantBillAdvance: 'N',
  },
  waterConsumption: {
    mainMeter: 'I',
    studioUnsoftenedMeter: 'I',
    studioSoftenedMeter: 'I',
    mainMeterPrevious: 'N',
    studioUnsoftenedMeterPrevious: 'N',
    studioSoftenedMeterPrevious: 'N',
    pricePerM3: 'I',
    resourceWithdrawalFee: 'I',
    drinkingWaterFee: 'I',
    networkPerformanceFee: 'I',
    subscription: 'I',
    vat: 'I',
  },
  waterTreatment: {
    collectionConsumptionDistributor: 'I',
    collectionConsumptionCommunity: 'I',
    sanitationPerformance: 'I',
    vat: 'I',
  },
  waterSoftener: { description: 'N', quantity: 'N', unitPrice: 'N' },
  electricity: {
    tariffMode: 'I',
    subscriptionUnit: 'I',
    mainBase: 'I',
    mainHc: 'I',
    mainHp: 'I',
    studioBase: 'I',
    studioHc: 'I',
    studioHp: 'I',
    mainBasePrevious: 'N',
    mainHcPrevious: 'N',
    mainHpPrevious: 'N',
    studioBasePrevious: 'N',
    studioHcPrevious: 'N',
    studioHpPrevious: 'N',
    excisePerKwh: 'I',
    kwhPriceBase: 'I',
    kwhPriceHc: 'I',
    kwhPriceHp: 'I',
    subscriptionPerUnit: 'I',
    ctaTax: 'I',
    vat: 'I',
  },
  internet: { billedAmount: 'I' },
  heatPumpMaintenance: { billedAmount: 'N' },
}
