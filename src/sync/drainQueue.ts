// Sends the queued patches: one GET, one PUT (one commit) per period file, never two drains at
// once (ADR 0010). Vue-free. The 409 rebase and the retry policy are a later ticket (#52): a period
// that fails keeps its patches queued, the other periods still drain, and a `DrainError` is thrown.
import { applyPatch, type Patch } from '@/domain/applyPatch'
import { commitMessage } from '@/domain/commitMessage'
import { serializePeriodFile } from '@/domain/serializePeriodFile'
import { validatePeriodFile } from '@/domain/validatePeriodFile'
import { listPatches, removePatches } from '@/sync/patchQueue'
import { getPeriodFile, putPeriodFile, UnauthorizedError } from '@/sync/periodsApi'

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

async function drainPeriod(id: string, patches: Patch[]): Promise<string> {
  const { json, sha } = await getPeriodFile(id)
  const { file, problems } = validatePeriodFile(json)
  if (!file || problems.length) {
    throw new Error(`The period ${id} is read-only, its edits were not saved`)
  }
  for (const patch of patches) applyPatch(file, patch)
  const newSha = await putPeriodFile(id, serializePeriodFile(file), sha, commitMessage(id, patches))
  await removePatches(patches)
  return newSha
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
