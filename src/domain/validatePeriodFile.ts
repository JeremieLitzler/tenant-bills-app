// The "Validation" rules of docs/period-file.md: a file breaking one opens read-only and the app
// never writes it. Vue-free.
import type { PeriodFile } from './periodFile'

export const SUPPORTED_SCHEMA_VERSION = 1

// One code per rule, so the page can word the notice and a test can name the rule.
export type PeriodFileProblem =
  'schema-version' | 'months' | 'tenant-bill-advance' | 'water-index' | 'closed-on'

export interface PeriodFileValidation {
  // Undefined when the JSON is not shaped like a period file at all (unreadable).
  file: PeriodFile | undefined
  // Empty when the file can be written; otherwise the file opens read-only.
  problems: PeriodFileProblem[]
}

const WATER_INDEX_KEYS = [
  'mainMeter',
  'studioUnsoftenedMeter',
  'studioSoftenedMeter',
  'mainMeterPrevious',
  'studioUnsoftenedMeterPrevious',
  'studioSoftenedMeterPrevious',
]
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// September of the first year to August of the second, e.g. "2026-2027".
function expectedMonths(periodId: string): string[] | undefined {
  const match = /^(\d{4})-(\d{4})$/.exec(periodId)
  if (!match) return undefined
  const [firstYear, secondYear] = [Number(match[1]), Number(match[2])]
  const months: string[] = []
  for (let offset = 0; offset < 12; offset++) {
    const calendarMonth = ((8 + offset) % 12) + 1
    const year = calendarMonth >= 9 ? firstYear : secondYear
    months.push(`${year}-${String(calendarMonth).padStart(2, '0')}`)
  }
  return months
}

function isRealDate(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function hasExpectedMonths(months: unknown[], periodId: string): boolean {
  const expected = expectedMonths(periodId)
  return (
    expected !== undefined &&
    months.length === expected.length &&
    months.every((entry, index) => isObject(entry) && entry.month === expected[index])
  )
}

function everyMonthHasAdvance(months: unknown[]): boolean {
  return months.every(
    (entry) =>
      isObject(entry) &&
      isObject(entry.common) &&
      typeof entry.common.tenantBillAdvance === 'number',
  )
}

function everyWaterIndexIsInteger(months: unknown[]): boolean {
  return months.every((entry) => {
    if (!isObject(entry) || !isObject(entry.waterConsumption)) return true
    const water = entry.waterConsumption
    return WATER_INDEX_KEYS.every((key) => water[key] === undefined || Number.isInteger(water[key]))
  })
}

// `raw` is the parsed JSON of the file named `periodId`.
export function validatePeriodFile(raw: unknown, periodId: string): PeriodFileValidation {
  if (
    !isObject(raw) ||
    typeof raw.periodName !== 'string' ||
    !isObject(raw.settings) ||
    !Array.isArray(raw.months)
  ) {
    return { file: undefined, problems: [] }
  }
  const months: unknown[] = raw.months
  const problems: PeriodFileProblem[] = []
  if (raw.schemaVersion !== SUPPORTED_SCHEMA_VERSION) problems.push('schema-version')
  if (!hasExpectedMonths(months, periodId)) problems.push('months')
  if (!everyMonthHasAdvance(months)) problems.push('tenant-bill-advance')
  if (!everyWaterIndexIsInteger(months)) problems.push('water-index')
  if (raw.settings.closedOn !== undefined && !isRealDate(raw.settings.closedOn)) {
    problems.push('closed-on')
  }
  return { file: raw as unknown as PeriodFile, problems }
}
