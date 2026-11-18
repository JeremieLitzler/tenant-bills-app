// Sends the queued patches: one GET, one PUT (one commit) per period file, never two drains at
// once (ADR 0010). Vue-free. The 409 rebase and the retry policy are a later ticket: a failed
// drain leaves the queue untouched and throws.
import { applyPatch, type Patch } from '@/domain/applyPatch'
import { commitMessage } from '@/domain/commitMessage'
import { serializePeriodFile } from '@/domain/serializePeriodFile'
import { validatePeriodFile } from '@/domain/validatePeriodFile'
import { listPatches, removePatches } from '@/sync/patchQueue'
import { getPeriodFile, putPeriodFile } from '@/sync/periodsApi'

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

// Resolves with the new SHA of every period file written.
export function drainQueue(): Promise<Map<string, string>> {
  running ??= (async () => {
    try {
      const written = new Map<string, string>()
      // Loops: an edit typed during a drain joins the queue after the patches being sent.
      for (let queued = await listPatches(); queued.length; queued = await listPatches()) {
        const periods = [...new Set(queued.map((patch) => patch.period))]
        for (const id of periods) {
          const patches = queued.filter((patch) => patch.period === id)
          written.set(id, await drainPeriod(id, patches))
        }
      }
      return written
    } finally {
      running = undefined
    }
  })()
  return running
}
