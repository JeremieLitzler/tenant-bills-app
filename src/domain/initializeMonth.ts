// "Initialize the next month" (docs/scenarios.md, Cases 3 and 6; ADR 0007): the new month object
// that one queued patch carries. Vue-free.
import { writeEstimate } from './estimateTwelfthMonth'
import { splitHeatPumpAnnual } from './heatPumpSplit'
import { MAX_MONTHS, MONDAY, SUGGESTED_END_DAY_OF_MONTH, SUNDAY, WEDNESDAY } from './monthConstants'
import { FIELD_CATALOGUE } from './periodFile'
import type { MonthEntry, PeriodFile, SectionName } from './periodFile'

type Bag = Record<string, unknown>
const bag = (month: MonthEntry, section: SectionName) => month[section] as Bag

// The suggested end day of the month after `start` when it is Thursday to Sunday, otherwise the
// Sunday before (see `SUGGESTED_END_DAY_OF_MONTH`). Dates are UTC to keep the day stable across time zones.
export function suggestedEndDate(start: string): string {
  const d = new Date(`${start}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1, SUGGESTED_END_DAY_OF_MONTH)
  const weekday = d.getUTCDay()
  if (weekday >= MONDAY && weekday <= WEDNESDAY) d.setUTCDate(d.getUTCDate() - (weekday - SUNDAY))
  return d.toISOString().slice(0, 10)
}

// The new month is the previous one copied: inherited keys as stored, every `...Previous` index
// taken from the matching current index, the rest left empty.
function copyForward(previous: MonthEntry): MonthEntry {
  const next = { month: '' } as unknown as Record<string, unknown>
  for (const section of Object.keys(FIELD_CATALOGUE) as SectionName[]) {
    const from = bag(previous, section)
    const to: Bag = {}
    for (const [key, rule] of Object.entries(FIELD_CATALOGUE[section])) {
      const current = key.slice(0, -'Previous'.length)
      if (section !== 'common' && key.endsWith('Previous') && current in FIELD_CATALOGUE[section]) {
        if (from[current] !== undefined) to[key] = from[current]
      } else if (rule === 'inherited' && from[key] !== undefined) {
        to[key] = from[key]
      }
    }
    next[section] = to
  }
  return next as unknown as MonthEntry
}

// Undefined after the twelfth month: no next month is offered. `previousTwelfth` is the previous
// period's twelfth month, when that file exists, for the estimate.
export function initializeMonth(
  file: PeriodFile,
  previousTwelfth?: MonthEntry,
): MonthEntry | undefined {
  const count = file.months.length
  if (count === 0 || count >= MAX_MONTHS) return undefined
  const previous = file.months[count - 1]
  const startDate = previous.common.endDate
  if (startDate === undefined) return undefined // the previous month is not typed enough

  const next = copyForward(previous)
  next.month = startDate.slice(0, 7)
  Object.assign(next.common, {
    startDate,
    endDate: suggestedEndDate(startDate),
    tenantBillAdvance: 0,
  })
  if (file.heatPumpInvoiceEstimate) {
    next.heatPumpMaintenance.billedAmount = splitHeatPumpAnnual(file.heatPumpInvoiceEstimate)[count]
  }
  if (count === MAX_MONTHS - 1) writeEstimate(next, previous, previousTwelfth)
  return next
}
