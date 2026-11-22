// The estimated indexes of a twelfth month, by line id, kept in IndexedDB from its initialization
// until the real reading is confirmed (docs/period-file.md, "The estimated twelfth month"). The
// confirmation lists the indexes still equal to them. Vue-free. Local to the device that
// initialized the month; a failing write is ignored and a failing read is "no copy".
import { ESTIMATE_STORE, request, withStore } from '@/sync/localDb'

const keyOf = (period: string, month: string) => `${period}|${month}`

export const saveEstimate = (
  period: string,
  month: string,
  indexes: Record<string, number>,
): Promise<void> =>
  withStore(
    ESTIMATE_STORE,
    async (store) => void (await request(store.put({ key: keyOf(period, month), indexes }))),
  ).catch(() => undefined)

export const readEstimate = (
  period: string,
  month: string,
): Promise<Record<string, number> | undefined> =>
  withStore(ESTIMATE_STORE, (store) =>
    request<{ indexes: Record<string, number> } | undefined>(store.get(keyOf(period, month))),
  )
    .then((row) => row?.indexes)
    .catch(() => undefined)

export const removeEstimate = (period: string, month: string): Promise<void> =>
  withStore(
    ESTIMATE_STORE,
    async (store) => void (await request(store.delete(keyOf(period, month)))),
  ).catch(() => undefined)
