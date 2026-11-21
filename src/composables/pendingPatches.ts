// Edits not yet saved, per period: an in-memory mirror of the IndexedDB queue (src/sync/patchQueue.ts)
// so the count is readable synchronously. "Rafraîchir" is gated on it (src/composables/usePeriods.ts).
import { computed, ref } from 'vue'

const counts = ref<Record<string, number>>({})

// Every queued edit, all periods together: the badge of the app shell.
export const pendingCount = computed(() =>
  Object.values(counts.value).reduce((sum, count) => sum + count, 0),
)

export function pendingCountFor(periodId: string): number {
  return counts.value[periodId] ?? 0
}

export function setPendingCounts(next: Record<string, number>): void {
  counts.value = next
}
