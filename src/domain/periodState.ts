// The period status and the eligibility of "Clôturer la période" and "Nouvelle période"
// (docs/period-file.md, "The period status" and "Closing a period"). Computed, never stored (ADR 0008). Vue-free.
import { monthCompleteness } from './monthCompleteness'
import { MAX_MONTHS } from './monthConstants'
import type { ReadonlyPeriodFile } from './periodFile'

export type PeriodStatus = 'draft' | 'ongoing' | 'ending' | 'closed'

export interface PeriodNeighbours {
  // The previous period file exists and is not closed.
  previousOpen?: boolean
  // The next period was created from this one.
  nextDrafted?: boolean
}

export function periodStatus(
  file: ReadonlyPeriodFile,
  { previousOpen, nextDrafted }: PeriodNeighbours,
): PeriodStatus {
  if (file.closedOn) return 'closed'
  if (previousOpen) return 'draft'
  if (file.months.length === MAX_MONTHS && nextDrafted) return 'ending'
  return 'ongoing'
}

export function canClose(file: ReadonlyPeriodFile): boolean {
  return (
    !file.closedOn &&
    file.months.length === MAX_MONTHS &&
    file.months.every((m) => monthCompleteness(m).complete && !m.common.estimated)
  )
}

// For the confirmation; it never blocks the close.
export function monthsWithoutAdvance(file: ReadonlyPeriodFile): string[] {
  return file.months.filter((m) => m.common.tenantBillAdvance === 0).map((m) => m.month)
}

// A twelfth month is either estimated (flag set) or read (flag removed on confirmation), so its
// existence is what the rule needs.
export function canCreateNewPeriod(previous: ReadonlyPeriodFile | undefined): boolean {
  return previous === undefined || previous.months.length === MAX_MONTHS
}
