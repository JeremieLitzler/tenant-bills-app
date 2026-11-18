// The helpers every section's figures share. Vue-free.
import type { CommonInputs } from '../periodFile'

// An amount whose inputs are missing is `undefined`, shown as "—", never a silent zero.
export type Figure = number | undefined

// Excel's ROUND to cents: half away from zero. The exponent notation avoids 1.005 * 100 = 100.4999.
export function roundCents(value: number): number {
  const rounded = Number(`${Math.round(Number(`${Math.abs(value)}e2`))}e-2`)
  return value < 0 ? -rounded : rounded
}

// The operands, or undefined as soon as one is missing.
export function all(...values: Figure[]): number[] | undefined {
  return values.every((value) => value !== undefined) ? (values as number[]) : undefined
}

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export function addBill(landlordShare: Figure, tenantShare: Figure): Figure {
  const shares = all(landlordShare, tenantShare)
  return shares && roundCents(shares[0] + shares[1])
}

export interface OccupantRatios {
  landlord: number
  tenant: number
}

// No occupant at all has no ratio: uncomputable rather than a division by zero.
export function occupantRatios(common: CommonInputs): OccupantRatios | undefined {
  const occupants = all(common.landlordOccupants, common.tenantOccupants)
  const total = occupants && occupants[0] + occupants[1]
  return occupants && total
    ? { landlord: occupants[0] / total, tenant: occupants[1] / total }
    : undefined
}
