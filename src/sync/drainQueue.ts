// Sends the queued patches: one GET, one PUT (one commit) per period file, never two drains at
// once (ADR 0010). Vue-free. On a 409 the period is pulled, the same patches re-applied and the PUT
// retried once (ADR 0004). A period that fails keeps its patches queued, the other periods still
// drain, and a `DrainError` is thrown.
import { applyPatch, type Patch } from '@/domain/applyPatch'
import { commitMessage } from '@/domain/commitMessage'
import { serializePeriodFile } from '@/domain/serializePeriodFile'
import { validatePeriodFile } from '@/domain/validatePeriodFile'
import { listPatches, removePatches } from '@/sync/patchQueue'
import { savePeriodCopy } from '@/sync/periodCopies'
import { ConflictError, getPeriodFile, putPeriodFile, UnauthorizedError } from '@/sync/periodsApi'

// The first failure of a drain, with the new SHA of every period written before it, so the loaded
// copies of those periods do not keep a stale SHA.
export class DrainError extends Error {
  constructor(
    readonly cause: unknown,
    readonly written: Map<string, string>,
  ) {
    super('The queue could not be fully saved')
    this.name = 'DrainError'
  }
}

// Periods that received queued edits after being closed, for the UI to flag.
export const editedClosedPeriods = new Set<string>()

async function attempt(id: string, patches: Patch[]) {
  const { json, sha } = await getPeriodFile(id)
  const { file, problems } = validatePeriodFile(json)
  if (!file || problems.length) {
    throw new Error(`The period ${id} is read-only, its edits were not saved`)
  }
  for (const patch of patches) applyPatch(file, patch)
  const newSha = await putPeriodFile(id, serializePeriodFile(file), sha, commitMessage(id, patches))
  return { file, newSha }
}

async function drainPeriod(id: string, patches: Patch[]): Promise<string> {
  let result
  try {
    result = await attempt(id, patches)
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error
    result = await attempt(id, patches) // a second 409 propagates, the patches stay queued
  }
  if (result.file.closedOn) editedClosedPeriods.add(id)
  await removePatches(patches)
  await savePeriodCopy({ id, json: result.file, sha: result.newSha })
  return result.newSha
}

let running: Promise<Map<string, string>> | undefined

// Resolves with the new SHA of every period file written; throws a `DrainError` when a period failed.
export function drainQueue(): Promise<Map<string, string>> {
  running ??= (async () => {
    try {
      const written = new Map<string, string>()
      const failed = new Set<string>()
      let firstError: unknown
      // Loops: an edit typed during a drain joins the queue after the patches being sent.
      for (let queued = await listPatches(); ; queued = await listPatches()) {
        queued = queued.filter((patch) => !failed.has(patch.period))
        if (!queued.length) break
        for (const id of new Set(queued.map((patch) => patch.period))) {
          try {
            written.set(
              id,
              await drainPeriod(
                id,
                queued.filter((patch) => patch.period === id),
              ),
            )
          } catch (error) {
            failed.add(id)
            firstError ??= error
            // Every other period would be refused too: stop at once.
            if (error instanceof UnauthorizedError) throw new DrainError(error, written)
          }
        }
      }
      if (failed.size) throw new DrainError(firstError, written)
      return written
    } finally {
      running = undefined
    }
  })()
  return running
}
