// What is the value of this key in this month? The way the sheet's `=C18` formulas answer it, so
// the landlord types only what changed (docs/period-file.md, "Absent, zero and inherited").
// Vue-free.
import { FIELD_CATALOGUE } from './periodFile'
import type { PeriodFile, SectionInputs, SectionName } from './periodFile'

// Where a resolved value comes from: stored for this month (typed), taken from an earlier month
// (inherited), worked out from other stored values such as a previous index (derived), or
// calculated by a formula (computed, reserved for the formulas).
export type Provenance = 'typed' | 'inherited' | 'derived' | 'computed'

export interface Resolved<T> {
  value: T
  provenance: Provenance
}

type KeyOf<S extends SectionName> = keyof SectionInputs[S] & string
type ValueOf<S extends SectionName, K extends KeyOf<S>> = Exclude<SectionInputs[S][K], undefined>

const PREVIOUS_SUFFIX = 'Previous'

// Only meters have previous indexes; `common.readingDatePrevious` is the opening "Du", not one.
const METER_SECTIONS: readonly SectionName[] = ['waterConsumption', 'electricity']

// The current-index key a `...Previous` key belongs to, if it is one.
function currentKeyOf(section: SectionName, key: string): string | undefined {
  if (!METER_SECTIONS.includes(section) || !key.endsWith(PREVIOUS_SUFFIX)) return undefined
  const current = key.slice(0, -PREVIOUS_SUFFIX.length)
  return current in FIELD_CATALOGUE[section] ? current : undefined
}

function monthIndex(file: PeriodFile, month: string): number {
  return file.months.findIndex((entry) => entry.month === month)
}

// Undefined means empty: nothing typed, and nothing to inherit or derive. An unknown month is also
// undefined: the validation of #45 guarantees the months exist.
export function resolveValue<S extends SectionName, K extends KeyOf<S>>(
  file: PeriodFile,
  month: string,
  section: S,
  key: K,
): Resolved<ValueOf<S, K>> | undefined {
  const index = monthIndex(file, month)
  return index < 0 ? undefined : resolveAtIndex(file, index, section, key)
}

// The worker behind `resolveValue`, on a month's position in `file.months`. The month's own value
// wins (typed). Otherwise it walks back through the earlier months: a `...Previous` index takes the
// resolved current index of the month before (derived), an inherited key takes the value of the
// month before (inherited), and anything else is empty. Recursion ends at the first month.
function resolveAtIndex<S extends SectionName, K extends KeyOf<S>>(
  file: PeriodFile,
  index: number,
  section: S,
  key: K,
): Resolved<ValueOf<S, K>> | undefined {
  const own = (file.months[index][section] as Record<string, unknown>)[key]
  if (own !== undefined) return { value: own as ValueOf<S, K>, provenance: 'typed' }
  if (index === 0) return undefined

  const currentKey = currentKeyOf(section, key)
  if (currentKey !== undefined) {
    const previousCurrent = resolveAtIndex(file, index - 1, section, currentKey as KeyOf<S>)
    return (
      previousCurrent && {
        // Safe: both keys hold the same type (numbers), checked by `MeterPairsAgree` in periodFile.ts.
        value: previousCurrent.value as unknown as ValueOf<S, K>,
        provenance: 'derived',
      }
    )
  }

  if (FIELD_CATALOGUE[section][key] === 'inherited') {
    const earlier = resolveAtIndex(file, index - 1, section, key)
    return earlier && { value: earlier.value, provenance: 'inherited' }
  }
  return undefined
}

// The start of the month's date range, the sheet's "Du": the previous month's reading date, or the
// period's opening date in the first month. Not the first day of the calendar month.
export function resolveMonthWindowStart(
  file: PeriodFile,
  month: string,
): Resolved<string> | undefined {
  const index = monthIndex(file, month)
  if (index < 0) return undefined
  if (index === 0) {
    const opening = file.months[0].common.readingDatePrevious
    return opening === undefined ? undefined : { value: opening, provenance: 'typed' }
  }
  const previous = file.months[index - 1].common.readingDate
  return previous === undefined ? undefined : { value: previous, provenance: 'derived' }
}
