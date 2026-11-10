// The "signed in" hint, persisted in IndexedDB so the app opens offline still signed in.
// It holds the GitHub login only; the token sits in an HttpOnly cookie the app cannot read.
// Every call swallows storage errors (private window, blocked storage): the in-memory
// session state stays authoritative and a stale hint is corrected by the first 401.
const DATABASE_NAME = 'tenant-bills'
const STORE_NAME = 'session'
const LOGIN_KEY = 'login'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function readSessionHint(): Promise<string | null> {
  try {
    const login = await run('readonly', (store) => store.get(LOGIN_KEY))
    return typeof login === 'string' && login !== '' ? login : null
  } catch {
    return null
  }
}

export async function writeSessionHint(login: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.put(login, LOGIN_KEY))
  } catch {
    // Ignored: see the header comment.
  }
}

export async function clearSessionHint(): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(LOGIN_KEY))
  } catch {
    // Ignored: see the header comment.
  }
}
