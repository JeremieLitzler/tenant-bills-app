import type { WaterSoftenerInputs } from '../periodFile'
import { roundCents, type Figure, type OccupantRatios } from './figureMath'

export interface WaterSoftenerFigures {
  landlordShare: Figure
  tenantShare: Figure
}

// Quantity times unit price, split by occupants. No quantity and no price is no purchase that month:
// no cost. Only one of the two missing is an emptied input: uncomputable.
export function waterSoftenerFigures(
  softener: WaterSoftenerInputs,
  ratios?: OccupantRatios,
): WaterSoftenerFigures {
  const { quantity, unitPrice } = softener
  const cost = quantity === undefined && unitPrice === undefined ? 0 : quantity! * unitPrice!
  const share = (ratio: number | undefined): Figure =>
    ratio === undefined || Number.isNaN(cost) ? undefined : roundCents(cost * ratio)
  return { landlordShare: share(ratios?.landlord), tenantShare: share(ratios?.tenant) }
}
