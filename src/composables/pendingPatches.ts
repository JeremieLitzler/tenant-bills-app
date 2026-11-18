// Edits not yet saved, per period: an in-memory mirror of the IndexedDB queue (src/sync/patchQueue.ts)
// so the count is readable synchronously. "Rafraîchir" is gated on it (src/composables/usePeriods.ts).
import { ref } from 'vue'

const counts = ref<Record<string, number>>({})

export function pendingCountFor(id: string): number {
  return counts.value[id] ?? 0
}

export function setPendingCounts(next: Record<string, number>): void {
  counts.value = next
}
