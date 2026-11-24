// The period status and the eligibility of "Clôturer la période" and "Nouvelle période"
// (docs/period-file.md, "The period status" and "Closing a period"). Computed, never stored (ADR 0008). Vue-free.
import { monthCompleteness } from './monthCompleteness'
import { MAX_MONTHS } from './monthConstants'
import type { ReadonlyPeriodFile } from './periodFile'

export type PeriodStatus = 'draft' | 'ongoing' | 'ending' | 'closed'

export interface PeriodNeighbours {
  // The previous period file exists and is not closed.
  previousOpen: boolean
  // The next period was created from this one.
  nextDrafted: boolean
}

const hasAllMonths = (file: ReadonlyPeriodFile) => file.months.length === MAX_MONTHS

export function periodStatus(
  file: ReadonlyPeriodFile,
  { previousOpen, nextDrafted }: PeriodNeighbours,
): PeriodStatus {
  if (file.closedOn) {
    return 'closed'
  }
  // A draft has fewer than twelve months and an ending period exactly twelve: they cannot overlap.
  if (hasAllMonths(file) && previousOpen && nextDrafted) {
    throw new Error('A period cannot be both draft and ending')
  }
  if (previousOpen) {
    return 'draft'
  }
  if (hasAllMonths(file) && nextDrafted) {
    return 'ending'
  }
  return 'ongoing'
}

// The file-based conditions of closing, one flag each, for the checklist. The fifth condition (the
// file is not read-only) belongs to the loaded entry, not to the file.
export interface CloseChecks {
  notClosed: boolean
  twelveMonths: boolean
  allComplete: boolean
  noneEstimated: boolean
}

export function closeChecks(file: ReadonlyPeriodFile): CloseChecks {
  return {
    notClosed: !file.closedOn,
    twelveMonths: hasAllMonths(file),
    allComplete: file.months.every((m) => monthCompleteness(m).complete),
    noneEstimated: file.months.every((m) => !m.common.estimated),
  }
}

export function canClose(file: ReadonlyPeriodFile): boolean {
  return Object.values(closeChecks(file)).every(Boolean)
}

// For the confirmation; it never blocks the close.
export function monthsWithoutAdvance(file: ReadonlyPeriodFile): string[] {
  return file.months.filter((m) => m.common.tenantBillAdvance === 0).map((m) => m.month)
}

// A twelfth month is either estimated (flag set) or read (flag removed on confirmation), so its
// existence is what the rule needs.
export function canCreateNewPeriod(previousFile: ReadonlyPeriodFile | undefined): boolean {
  return previousFile === undefined || hasAllMonths(previousFile)
}

// How far the settlement can be trusted (ADR 0006): provisional until the twelfth month exists,
// estimated while its indexes are estimates, read once its reading date is typed (the water bills
// are still due), final once closed.
export type SettlementState = 'provisional' | 'estimated' | 'read' | 'final'

export function settlementState(file: ReadonlyPeriodFile): SettlementState {
  if (file.closedOn) return 'final'
  const twelfth = hasAllMonths(file) ? file.months[MAX_MONTHS - 1] : undefined
  if (!twelfth) return 'provisional'
  if (twelfth.common.estimated) return 'estimated'
  return twelfth.common.endDate ? 'read' : 'provisional'
}
