import type { WaterSoftenerInputs } from '../periodFile'
import { allDefined, roundCents, type Figure, type OccupantRatios } from './figureMath'

export interface WaterSoftenerFigures {
  landlordShare: Figure
  tenantShare: Figure
}

// Quantity times unit price, split by occupants. No purchase (nothing typed, or a quantity of 0)
// costs nothing; a quantity without its unit price is an emptied input: uncomputable.
export function waterSoftenerFigures(
  softener: WaterSoftenerInputs,
  ratios?: OccupantRatios,
): WaterSoftenerFigures {
  const { quantity, unitPrice } = softener
  const operands = allDefined(quantity, unitPrice)
  const noPurchase = quantity === 0 || (quantity === undefined && unitPrice === undefined)
  const cost = noPurchase ? 0 : operands && operands[0] * operands[1]
  const share = (ratio: number | undefined): Figure =>
    ratio === undefined || cost === undefined ? undefined : roundCents(cost * ratio)
  return { landlordShare: share(ratios?.landlord), tenantShare: share(ratios?.tenant) }
}
