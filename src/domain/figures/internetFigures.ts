import type { InternetInputs } from '../periodFile'
import { roundCents, type Figure, type OccupantRatios } from './figureMath'

export interface InternetFigures {
  landlordShare: Figure
  tenantShare: Figure
  bill: Figure
}

export function internetFigures(
  internet: InternetInputs,
  ratios?: OccupantRatios,
): InternetFigures {
  const { billedAmount } = internet
  const share = (ratio: number | undefined): Figure =>
    billedAmount === undefined || ratio === undefined ? undefined : roundCents(billedAmount * ratio)
  return {
    landlordShare: share(ratios?.landlord),
    tenantShare: share(ratios?.tenant),
    bill: billedAmount,
  }
}
