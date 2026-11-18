import { describe, expect, it } from 'vitest'

import { addBill, allDefined, occupantRatios, roundCents, sum } from './figureMath'

describe('roundCents', () => {
  it('rounds half away from zero, like Excel', () => {
    expect(roundCents(1.005)).toBe(1.01)
    expect(roundCents(2.675)).toBe(2.68)
    expect(roundCents(-1.005)).toBe(-1.01)
    expect(roundCents(0.004)).toBe(0)
  })

  it('keeps a value that already has two decimals', () => {
    expect(roundCents(12.34)).toBe(12.34)
    expect(roundCents(0)).toBe(0)
  })
})

describe('allDefined', () => {
  it('returns the operands when every one is defined, zero included', () => {
    expect(allDefined(1, 0, 3)).toEqual([1, 0, 3])
  })

  it('returns undefined as soon as one is missing', () => {
    expect(allDefined(1, undefined, 3)).toBeUndefined()
  })
})

describe('sum', () => {
  it('adds the values, and gives 0 for none', () => {
    expect(sum([1, 2, 3.5])).toBe(6.5)
    expect(sum([])).toBe(0)
  })
})

describe('addBill', () => {
  it('adds the two shares and rounds to cents', () => {
    expect(addBill(10.1, 20.2)).toBe(30.3)
  })

  it('is uncomputable when a share is', () => {
    expect(addBill(undefined, 20)).toBeUndefined()
    expect(addBill(10, undefined)).toBeUndefined()
  })
})

describe('occupantRatios', () => {
  it('splits the occupants into two ratios that add up to 1', () => {
    expect(
      occupantRatios({ landlordOccupants: 4, tenantOccupants: 1, tenantBillAdvance: 0 }),
    ).toEqual({
      landlord: 0.8,
      tenant: 0.2,
    })
  })

  it('is uncomputable when a count is missing', () => {
    expect(occupantRatios({ landlordOccupants: 4, tenantBillAdvance: 0 })).toBeUndefined()
  })

  it('is uncomputable, not a division by zero, with no occupant at all', () => {
    expect(
      occupantRatios({ landlordOccupants: 0, tenantOccupants: 0, tenantBillAdvance: 0 }),
    ).toBeUndefined()
  })
})
