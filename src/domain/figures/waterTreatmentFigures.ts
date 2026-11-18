import type { WaterConsumptionInputs, WaterTreatmentInputs } from '../periodFile'
import { addBill, all, roundCents, sum, type Figure, type OccupantRatios } from './figureMath'
import { waterVolumes } from './waterConsumptionFigures'

export interface WaterTreatmentFigures {
  landlordShare: Figure
  tenantShare: Figure
  bill: Figure
}

// The treatment is billed on the same volumes as the consumption.
export function waterTreatmentFigures(
  treatment: WaterTreatmentInputs,
  water: WaterConsumptionInputs,
  ratios?: OccupantRatios,
): WaterTreatmentFigures {
  const { deltaMain, studioVolume } = waterVolumes(water)
  const collection = all(
    treatment.collectionConsumptionDistributor,
    treatment.collectionConsumptionCommunity,
    treatment.sanitationPerformance,
  )
  const collectionSubscription = all(
    treatment.monthlySubscriptionDistributor,
    treatment.monthlySubscriptionCommunity,
  )
  const share = (volume: Figure, ratio: number | undefined): Figure => {
    if (!collection || !collectionSubscription || volume === undefined) return undefined
    if (ratio === undefined || treatment.vat === undefined) return undefined
    return roundCents(
      (sum(collection) * volume + sum(collectionSubscription) * ratio) * treatment.vat,
    )
  }
  const landlordShare = share(
    deltaMain !== undefined && studioVolume !== undefined ? deltaMain - studioVolume : undefined,
    ratios?.landlord,
  )
  const tenantShare = share(studioVolume, ratios?.tenant)
  return { landlordShare, tenantShare, bill: addBill(landlordShare, tenantShare) }
}
