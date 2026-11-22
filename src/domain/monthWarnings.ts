// The warnings of a month: implausible values the table highlights, never blocks (docs/architecture.md,
// "Period table"). Keyed by the id of the line to highlight (`section.key`). Vue-free.
import type { MonthEntry } from './periodFile'

export type WarningKind = 'indexBelowPrevious' | 'endBeforeStart' | 'startNotPreviousEnd'
export type MonthWarnings = Record<string, WarningKind>

const METERS = {
  waterConsumption: ['mainMeter', 'studioUnsoftenedMeter', 'studioSoftenedMeter'],
  electricity: ['mainBase', 'mainHc', 'mainHp', 'studioBase', 'studioHc', 'studioHp'],
} as const

export function monthWarnings(entry: MonthEntry, previousMonth?: MonthEntry): MonthWarnings {
  const warnings: MonthWarnings = {}
  for (const [section, keys] of Object.entries(METERS)) {
    const inputs = (entry[section as keyof typeof METERS] ?? {}) as Record<
      string,
      number | undefined
    >
    for (const key of keys) {
      const current = inputs[key]
      const previous = inputs[`${key}Previous`]
      if (current !== undefined && previous !== undefined && current < previous) {
        warnings[`${section}.${key}`] = 'indexBelowPrevious'
      }
    }
  }
  const { startDate, endDate } = entry.common ?? {}
  // "YYYY-MM-DD" strings compare in date order.
  if (startDate && endDate && endDate < startDate) warnings['common.endDate'] = 'endBeforeStart'
  // A month starts the day the previous one ends (docs/period-file.md).
  const previousEnd = previousMonth?.common?.endDate
  if (startDate && previousEnd && startDate !== previousEnd) {
    warnings['common.startDate'] = 'startNotPreviousEnd'
  }
  return warnings
}
