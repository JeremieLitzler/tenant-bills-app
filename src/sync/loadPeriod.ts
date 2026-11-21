// Reads one period for display: the remote file, remembered as the local copy, or, when the remote
// cannot be read, the last copy (ADR 0010: the queue is untouched). The queued patches are then
// applied, so a reload shows unsaved edits. Vue-free.
import { applyPatch } from '@/domain/applyPatch'
import type { PeriodFile } from '@/domain/periodFile'
import { type PeriodFileProblem, validatePeriodFile } from '@/domain/validatePeriodFile'
import { listPatches } from '@/sync/patchQueue'
import { readPeriodCopy, savePeriodCopy } from '@/sync/periodCopies'
import {
  getPeriodFile,
  MisconfiguredError,
  NotFoundError,
  UnauthorizedError,
} from '@/sync/periodsApi'

export interface LoadedPeriod {
  // Undefined when the JSON is not shaped like a period file.
  file?: PeriodFile
  problems: PeriodFileProblem[]
  sha: string
  fromCopy: boolean
}

// A 401, a 404 and a misconfigured proxy throw. Any other failure shows the copy; with no copy it throws.
export async function loadPeriodWithCopy(id: string): Promise<LoadedPeriod> {
  let content: { json: unknown; sha: string }
  let fromCopy = false
  try {
    content = await getPeriodFile(id)
    await savePeriodCopy({ id, ...content })
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError ||
      error instanceof MisconfiguredError
    ) {
      throw error
    }
    const copy = await readPeriodCopy(id)
    if (!copy) throw error
    content = copy
    fromCopy = true
  }
  const { file, problems } = validatePeriodFile(content.json)
  // A file breaking a rule is read-only, so it has no edits to show.
  if (file && !problems.length) {
    for (const patch of await listPatches()) if (patch.period === id) applyPatch(file, patch)
  }
  return { file, problems, sha: content.sha, fromCopy }
}
