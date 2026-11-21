// The last remote file of each period with its SHA, in IndexedDB, so a reload offline still shows
// the period. The queued patches are applied on top by the caller. Vue-free. The copy is a cache:
// a failing write is ignored and a failing read is "no copy".
import { COPY_STORE, request, withStore } from '@/sync/localDb'

export interface PeriodCopy {
  id: string
  json: unknown
  sha: string
}

export const savePeriodCopy = (copy: PeriodCopy): Promise<void> =>
  withStore(COPY_STORE, async (store) => void (await request(store.put(copy)))).catch(
    () => undefined,
  )

export const readPeriodCopy = (id: string): Promise<PeriodCopy | undefined> =>
  withStore(COPY_STORE, (store) => request<PeriodCopy | undefined>(store.get(id))).catch(
    () => undefined,
  )
