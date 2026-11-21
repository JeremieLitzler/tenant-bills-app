// The save queue as the views see it: enqueue a patch, drain, and what the last drain said. A
// singleton composable (docs/architecture.md, "State") over src/sync/, imported by usePeriods.ts
// only; it never touches the loaded periods, the drain hands back the new SHAs instead.
import { computed, readonly, ref } from 'vue'

import { expireOnUnauthorized } from '@/composables/expireOnUnauthorized'
import { setPendingCounts } from '@/composables/pendingPatches'
import { useToasts } from '@/composables/useToasts'
import type { Patch } from '@/domain/applyPatch'
import { fr } from '@/i18n/fr'
import { DrainError, drainQueue } from '@/sync/drainQueue'
import { enqueuePatch, listPatches } from '@/sync/patchQueue'

// What the last drain failed with, cleared by the next successful one. A failed drain also tells
// the landlord through an error toast.
const lastError = ref<unknown>()

// Drains running now (a counter: `setCell` and the online event can overlap).
const draining = ref(0)
const online = ref(navigator.onLine)
window.addEventListener('online', () => (online.value = true))
window.addEventListener('offline', () => (online.value = false))

export type SyncState = 'idle' | 'saving' | 'offline' | 'error'

// What the app shell shows next to the count of queued edits.
const syncState = computed<SyncState>(() => {
  if (!online.value) return 'offline'
  if (draining.value > 0) return 'saving'
  return lastError.value === undefined ? 'idle' : 'error'
})

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
  draining.value++
  try {
    written = await drainQueue()
    lastError.value = undefined
  } catch (error) {
    const cause = error instanceof DrainError ? error.cause : error
    if (error instanceof DrainError) written = error.written
    lastError.value = cause
    console.error(cause)
    // Offline is told by the sync status of the app shell, not a toast.
    if (navigator.onLine) useToasts().notify({ level: 'error', message: fr.toast.saveFailed })
    expireOnUnauthorized(cause)
  } finally {
    draining.value--
  }
  await syncPendingCounts()
  return written
}

export function useSaveQueue() {
  return { lastError: readonly(lastError), syncState, enqueue, drain }
}
