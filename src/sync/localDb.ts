// The IndexedDB database behind the patch queue and the period copies. Vue-free. Version 2 added
// the `period-copies` store; an upgrade from 1 keeps the queue untouched.
const DB_NAME = 'tenant-bills'
export const QUEUE_STORE = 'patch-queue'
export const COPY_STORE = 'period-copies'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(COPY_STORE)) {
        db.createObjectStore(COPY_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function withStore<T>(
  name: string,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await open()
  try {
    return await run(db.transaction(name, 'readwrite').objectStore(name))
  } finally {
    db.close()
  }
}
