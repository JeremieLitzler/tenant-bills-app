import type { WaterConsumptionInputs } from '@/domain/periodFile'
import { waterVolumes } from './waterVolumes'
import {
  addBill,
  allDefined,
  roundCents,
  sum,
  type Figure,
  type OccupantRatios,
} from './figureMath'

export interface WaterConsumptionFigures {
  deltaMain: Figure
  deltaStudioUnsoftened: Figure
  deltaStudioSoftened: Figure
  landlordShare: Figure
  tenantShare: Figure
  bill: Figure
}

export function waterConsumptionFigures(
  water: WaterConsumptionInputs,
  ratios?: OccupantRatios,
): WaterConsumptionFigures {
  const { deltaMain, deltaStudioUnsoftened, deltaStudioSoftened, studioVolume } =
    waterVolumes(water)
  const prices = allDefined(
    water.pricePerM3,
    water.resourceWithdrawalFee,
    water.drinkingWaterFee,
    water.networkPerformanceFee,
  )
  const share = (volume: Figure, ratio: number | undefined): Figure => {
    if (!prices || volume === undefined || ratio === undefined) return undefined
    if (water.subscription === undefined || water.vat === undefined) return undefined
    return roundCents((volume * sum(prices) + water.subscription * ratio) * water.vat)
  }
  const landlordShare = share(deltaMain, ratios?.landlord)
  const tenantShare = share(studioVolume, ratios?.tenant)
  return {
    deltaMain,
    deltaStudioUnsoftened,
    deltaStudioSoftened,
    landlordShare,
    tenantShare,
    bill: addBill(landlordShare, tenantShare),
  }
}
