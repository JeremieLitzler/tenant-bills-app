import type { WaterConsumptionInputs } from '../periodFile'
import { addBill, all, roundCents, sum, type Figure, type OccupantRatios } from './figureMath'

export interface WaterConsumptionFigures {
  deltaMain: Figure
  deltaStudioUnsoftened: Figure
  deltaStudioSoftened: Figure
  landlordShare: Figure
  tenantShare: Figure
  bill: Figure
}

// A water index is typed in litres; a delta is in m³.
function delta(current: Figure, previous: Figure): Figure {
  const operands = all(current, previous)
  return operands && (operands[0] - operands[1]) / 1000
}

// The volumes the water treatment shares reuse.
export function waterVolumes(water: WaterConsumptionInputs) {
  const deltaMain = delta(water.mainMeter, water.mainMeterPrevious)
  const deltaStudioUnsoftened = delta(
    water.studioUnsoftenedMeter,
    water.studioUnsoftenedMeterPrevious,
  )
  const deltaStudioSoftened = delta(water.studioSoftenedMeter, water.studioSoftenedMeterPrevious)
  const studioVolume = all(deltaStudioUnsoftened, deltaStudioSoftened)?.reduce((a, b) => a + b)
  return { deltaMain, deltaStudioUnsoftened, deltaStudioSoftened, studioVolume }
}

export function waterConsumptionFigures(
  water: WaterConsumptionInputs,
  ratios?: OccupantRatios,
): WaterConsumptionFigures {
  const { deltaMain, deltaStudioUnsoftened, deltaStudioSoftened, studioVolume } =
    waterVolumes(water)
  const prices = all(
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
