// The patch contract of docs/period-file.md ("Patches", ADR 0010). Vue-free.
import type { MonthEntry, PeriodFile } from './periodFile'

// The `field` of a patch whose value is a whole month object (initializing a month).
export const MONTH_FIELD = 'month'

export interface Patch {
  period: string
  // Null for a top-level value (`closedOn`, ...).
  month: string | null
  // `<section>.<key>`, a top-level key, or `month` for a whole month object.
  field: string
  value: unknown
}

// The queue key of a patch: a retyped cell has the same key, so it replaces its queued patch.
export const patchKey = (patch: Patch) => `${patch.period}|${patch.month ?? ''}|${patch.field}`

type Bag = Record<string, unknown>

// Applies one patch to `file` in place. Never creates or removes a section object; `value: null`
// removes the key, except `common.tenantBillAdvance`, set to `0`. A month patch appends the month
// only when it comes after the last one (never overwrites, never breaks the order the validation
// requires); a patch for a month the file lacks is ignored.
export function applyPatch(file: PeriodFile, patch: Patch): void {
  const { month, field, value } = patch
  if (month === null) {
    const top = file as unknown as Bag
    if (value === null) delete top[field]
    else top[field] = value
    return
  }
  if (field === MONTH_FIELD) {
    const last = file.months.at(-1)
    if (!last || month > last.month) file.months.push(value as MonthEntry)
    return
  }
  const [section, key] = field.split('.')
  const target = file.months.find((entry) => entry.month === month)?.[
    section as keyof MonthEntry
  ] as Bag | undefined
  if (!target) return
  if (value !== null) target[key] = value
  else if (field === 'common.tenantBillAdvance') target[key] = 0
  else delete target[key]
}
