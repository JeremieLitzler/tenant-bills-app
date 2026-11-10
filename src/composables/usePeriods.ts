// Period state, a singleton composable (docs/architecture.md, "State"). Only the part the
// session needs exists yet: the pending count and clear(). F2 (data proxy) and F3 (save queue)
// fill in the rest, and call useSession().expire() on a 401.
import { readonly, ref } from 'vue'

import { useSession } from '@/composables/useSession'

// Whole queue, shown in the app shell. Zero until the queue exists (F3).
const pendingCount = ref(0)

useSession().setPendingCountSource(() => pendingCount.value)

// Drops the in-memory periods and keeps the queue.
function clear(): void {}

export function usePeriods() {
  return { pendingCount: readonly(pendingCount), clear }
}
