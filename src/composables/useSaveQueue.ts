// The save queue as the views see it: enqueue a patch, drain, and what the last drain said. A
// singleton composable (docs/architecture.md, "State") over src/sync/, imported by usePeriods.ts
// only; it never touches the loaded periods, the drain hands back the new SHAs instead.
import { readonly, ref } from 'vue'

import { expireOnUnauthorized } from '@/composables/expireOnUnauthorized'
import { setPendingCounts } from '@/composables/pendingPatches'
import type { Patch } from '@/domain/applyPatch'
import { DrainError, drainQueue } from '@/sync/drainQueue'
import { enqueuePatch, listPatches } from '@/sync/patchQueue'

// What the last drain failed with, cleared by the next successful one. Read by the sync status
// and error banner (#50) and by the global toast (#120), neither built yet.
const lastError = ref<unknown>()

async function syncPendingCounts(): Promise<void> {
  const counts: Record<string, number> = {}
  for (const patch of await listPatches()) counts[patch.period] = (counts[patch.period] ?? 0) + 1
  setPendingCounts(counts)
}

async function enqueue(patch: Patch): Promise<void> {
  await enqueuePatch(patch)
  await syncPendingCounts()
}

// Sends the queue and resolves with the new SHA of every period written, even when another period
// failed (the queue then keeps its patches, see `lastError`). A 401 ends the session.
async function drain(): Promise<Map<string, string>> {
  let written = new Map<string, string>()
  try {
    written = await drainQueue()
    lastError.value = undefined
  } catch (error) {
    const cause = error instanceof DrainError ? error.cause : error
    if (error instanceof DrainError) written = error.written
    lastError.value = cause
    console.error(cause)
    expireOnUnauthorized(cause)
  }
  await syncPendingCounts()
  return written
}

export function useSaveQueue() {
  return { lastError: readonly(lastError), enqueue, drain }
}
