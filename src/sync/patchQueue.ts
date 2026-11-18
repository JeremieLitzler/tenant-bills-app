// The patch queue (ADR 0010), in IndexedDB so it survives a reload. Vue-free. One record per
// cell, keyed by `patchKey`, so retyping a cell replaces its queued patch; `seq` keeps the order
// in which the patches must be applied (a month's initialization before its edits).
import { type Patch, patchKey } from '@/domain/applyPatch'

const DB_NAME = 'tenant-bills'
const STORE = 'patch-queue'

interface QueuedPatch {
  key: string
  seq: number
  patch: Patch
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await open()
  try {
    return await run(db.transaction(STORE, 'readwrite').objectStore(STORE))
  } finally {
    db.close()
  }
}

export async function enqueuePatch(patch: Patch): Promise<void> {
  await withStore(async (store) => {
    const all = await request<QueuedPatch[]>(store.getAll())
    const seq = Math.max(0, ...all.map((queued) => queued.seq)) + 1
    await request(store.put({ key: patchKey(patch), seq, patch } satisfies QueuedPatch))
  })
}

// Every queued patch, in the order they were typed.
export async function listPatches(): Promise<Patch[]> {
  const all = await withStore((store) => request<QueuedPatch[]>(store.getAll()))
  return all.sort((a, b) => a.seq - b.seq).map((queued) => queued.patch)
}

// Removes the sent patches, unless the cell was retyped meanwhile (its value then differs).
export async function removePatches(sent: Patch[]): Promise<void> {
  await withStore(async (store) => {
    for (const patch of sent) {
      const queued = await request<QueuedPatch | undefined>(store.get(patchKey(patch)))
      if (queued && JSON.stringify(queued.patch.value) === JSON.stringify(patch.value)) {
        await request(store.delete(queued.key))
      }
    }
  })
}
