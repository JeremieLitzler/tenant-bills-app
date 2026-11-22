// The estimated twelfth month (docs/period-file.md, "The estimated twelfth month"; docs/scenarios.md,
// Case 6; issue #61). Called by `initializeMonth` when the twelfth month is initialized. Vue-free.
import { ELECTRICITY_TARIFFS, TARIFFS_BY_MODE } from './electricityTariffs'
import { ELECTRICITY_METERS, HC_SHARE, WATER_METERS } from './monthConstants'
import type { MonthEntry } from './periodFile'

type Bag = Record<string, unknown>

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// A meter's consumption in a month: the sum of its registers' current minus previous index, in the
// month's own tariff mode; undefined when an index is missing.
function waterDelta(month: MonthEntry, meter: string): number | undefined {
  const w = month.waterConsumption as Bag
  const [cur, prev] = [w[meter], w[`${meter}Previous`]]
  return typeof cur === 'number' && typeof prev === 'number' ? cur - prev : undefined
}

function electricityDelta(month: MonthEntry, meter: string): number | undefined {
  const e = month.electricity as Bag
  const registers = TARIFFS_BY_MODE[e.tariffMode === 'hchp' ? 'hchp' : 'base']
  let total = 0
  for (const r of registers) {
    const [cur, prev] = [e[meter + r], e[`${meter}${r}Previous`]]
    if (typeof cur !== 'number' || typeof prev !== 'number') return undefined
    total += cur - prev
  }
  return total
}

// Case 6: each current index becomes the new month's previous index plus the meter's delta, taken
// from the previous period's twelfth month, else from this period's eleventh. A meter with no
// delta, or no previous index to add it to, stays empty.
export function writeEstimate(
  next: MonthEntry,
  eleventh: MonthEntry,
  previousTwelfth?: MonthEntry,
) {
  const water = next.waterConsumption as Bag
  for (const meter of WATER_METERS) {
    const delta =
      (previousTwelfth && waterDelta(previousTwelfth, meter)) ?? waterDelta(eleventh, meter)
    const base = water[`${meter}Previous`]
    if (delta !== undefined && typeof base === 'number') water[meter] = Math.round(base + delta)
  }

  const electricity = next.electricity as Bag
  const hchp = electricity.tariffMode === 'hchp'
  for (const meter of ELECTRICITY_METERS) {
    const delta =
      (previousTwelfth && electricityDelta(previousTwelfth, meter)) ??
      electricityDelta(eleventh, meter)
    if (delta === undefined) continue
    const shares: [string, number][] = hchp
      ? [
          ['Hc', HC_SHARE],
          ['Hp', 1 - HC_SHARE],
        ]
      : [['Base', 1]]
    for (const [register, share] of shares) {
      const base = electricity[`${meter}${register}Previous`]
      if (typeof base === 'number') electricity[meter + register] = round(base + delta * share, 2)
    }
  }
  next.common.estimated = true
}

// The current indexes of a month just estimated, by line id ("waterConsumption.mainMeter"): the
// copy kept until the real reading is confirmed. Current indexes are not copied forward, so every
// one present is an estimate.
export function estimatedIndexes(month: MonthEntry): Record<string, number> {
  const found: Record<string, number> = {}
  const add = (section: 'waterConsumption' | 'electricity', key: string) => {
    const value = (month[section] as Bag)[key]
    if (typeof value === 'number') found[`${section}.${key}`] = value
  }
  for (const meter of WATER_METERS) add('waterConsumption', meter)
  for (const meter of ELECTRICITY_METERS)
    for (const tariff of ELECTRICITY_TARIFFS) add('electricity', meter + tariff)
  return found
}
