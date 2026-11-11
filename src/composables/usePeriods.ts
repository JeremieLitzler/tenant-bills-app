// Period state, a singleton composable (docs/architecture.md, "State"). The only module reaching
// src/sync/. For now it holds the period list; the queue, the pending count and `usePeriod(id)`
// come with F3 (#30). It imports the session state, never the reverse.
import { readonly, ref } from 'vue'

import { useSession } from '@/composables/useSession'
import { listPeriodIds, UnauthorizedError } from '@/sync/periodsApi'

type ListStatus = 'idle' | 'loading' | 'ready' | 'error'

const periodIds = ref<string[]>([])
const listStatus = ref<ListStatus>('idle')

// Reads the periods folder through the proxy. A 401 ends the session (the app shell then
// redirects to the sign-in page); the state itself never redirects.
async function loadPeriodIds(): Promise<void> {
  listStatus.value = 'loading'
  try {
    periodIds.value = await listPeriodIds()
    listStatus.value = 'ready'
  } catch (error) {
    listStatus.value = 'error'
    if (error instanceof UnauthorizedError) {
      useSession().expire()
    }
  }
}

export function usePeriods() {
  return {
    periodIds: readonly(periodIds),
    listStatus: readonly(listStatus),
    loadPeriodIds,
  }
}
