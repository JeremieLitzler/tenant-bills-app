// The "Validation" rules of docs/period-file.md: a file breaking one opens read-only and the app
// never writes it. Vue-free.
import { FIELD_CATALOGUE } from './periodFile'
import type { PeriodFile } from './periodFile'

const SUPPORTED_SCHEMA_VERSION = 2

// One code per rule, so the page can word the notice and a test can name the rule.
export type PeriodFileProblem =
  'schema-version' | 'months' | 'sections' | 'water-index' | 'closed-on'

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
const SECTION_NAMES = Object.keys(FIELD_CATALOGUE)
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const MAX_MONTHS = 12
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

// One to twelve entries, each `month` a "YYYY-MM", unique and in order (strings of that shape
// compare like dates).
function hasValidMonths(months: unknown[]): boolean {
  return (
    months.length >= 1 &&
    months.length <= MAX_MONTHS &&
    months.every(
      (entry, index) =>
        isObject(entry) &&
        typeof entry.month === 'string' &&
        MONTH_PATTERN.test(entry.month) &&
        (index === 0 || (months[index - 1] as JsonObject).month! < entry.month),
    )
  )
}

function everyMonthHasSections(months: unknown[]): boolean {
  return months.every((entry) => isObject(entry) && SECTION_NAMES.every((s) => isObject(entry[s])))
}

function everyWaterIndexIsInteger(months: unknown[]): boolean {
  return months.every((entry) => {
    if (!isObject(entry) || !isObject(entry.waterConsumption)) return true
    const water = entry.waterConsumption
    return WATER_INDEX_KEYS.every((key) => water[key] === undefined || Number.isInteger(water[key]))
  })
}

// Only the two top-level keys the page and the state read are checked here; whether the rest of
// the file is sound is what `validatePeriodFile` reports as problems.
function isPeriodFileShaped(raw: unknown): raw is PeriodFile {
  return isObject(raw) && typeof raw.periodName === 'string' && Array.isArray(raw.months)
}

export function validatePeriodFile(raw: unknown): PeriodFileValidation {
  if (!isPeriodFileShaped(raw)) {
    return { file: undefined, problems: [] }
  }
  const months: unknown[] = raw.months
  const problems: PeriodFileProblem[] = []
  if (raw.schemaVersion !== SUPPORTED_SCHEMA_VERSION) problems.push('schema-version')
  if (!hasValidMonths(months)) problems.push('months')
  if (!everyMonthHasSections(months)) problems.push('sections')
  if (!everyWaterIndexIsInteger(months)) problems.push('water-index')
  const closedOn: unknown = raw.closedOn
  if (closedOn !== undefined && !isRealDate(closedOn)) problems.push('closed-on')
  return { file: raw, problems }
}
