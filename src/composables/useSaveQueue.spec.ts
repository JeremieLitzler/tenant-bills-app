import { beforeEach, describe, expect, it, vi } from 'vitest'

const drainQueue = vi.fn<() => Promise<Map<string, string>>>()
const enqueuePatch = vi.fn<(patch: unknown) => Promise<void>>()
const listPatches = vi.fn<() => Promise<unknown[]>>()
const setPendingCounts = vi.fn<(counts: Record<string, number>) => void>()

class UnauthorizedError extends Error {}
class DrainError extends Error {
  constructor(
    readonly cause: unknown,
    readonly written: Map<string, string>,
  ) {
    super('drain')
  }
}

vi.mock('@/sync/drainQueue', () => ({ drainQueue, DrainError }))
vi.mock('@/sync/patchQueue', () => ({ enqueuePatch, listPatches }))
vi.mock('@/sync/periodsApi', () => ({ UnauthorizedError }))
vi.mock('@/composables/pendingPatches', () => ({ setPendingCounts }))

async function load() {
  vi.resetModules()
  document.cookie = 'gh_login=JeremieLitzler; Path=/'
  const { useSaveQueue } = await import('./useSaveQueue')
  const { useSession } = await import('./useSession')
  return { queue: useSaveQueue(), session: useSession() }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  drainQueue.mockReset()
  enqueuePatch.mockReset()
  listPatches.mockReset()
  listPatches.mockResolvedValue([])
  setPendingCounts.mockReset()
})

describe('useSaveQueue', () => {
  it('counts the queued patches per period after an enqueue', async () => {
    const { queue } = await load()
    listPatches.mockResolvedValue([{ period: 'a' }, { period: 'a' }, { period: 'b' }])

    await queue.enqueue({ period: 'a', month: null, field: 'closedOn', value: 1 })

    expect(setPendingCounts).toHaveBeenLastCalledWith({ a: 2, b: 1 })
  })

  it('keeps the error of a failed drain, logs it, and clears it after a successful one', async () => {
    const { queue } = await load()
    const failure = new Error('500')
    drainQueue.mockRejectedValueOnce(new DrainError(failure, new Map([['a', 'sha-2']])))

    const written = await queue.drain()

    expect(written).toEqual(new Map([['a', 'sha-2']]))
    expect(queue.lastError.value).toBe(failure)
    expect(console.error).toHaveBeenCalledWith(failure)

    drainQueue.mockResolvedValueOnce(new Map())
    await queue.drain()
    expect(queue.lastError.value).toBeUndefined()
  })

  it('tells a failed drain with an error toast, except when the browser is offline', async () => {
    const { queue } = await load()
    const { useToasts } = await import('./useToasts')
    drainQueue.mockRejectedValue(new DrainError(new Error('500'), new Map()))

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await queue.drain()
    expect(useToasts().toasts.value).toEqual([])

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    await queue.drain()
    expect(useToasts().toasts.value).toMatchObject([{ level: 'error' }])
    expect(useToasts().toasts.value[0].message).toContain("n'ont pas pu être enregistrées")
  })

  it('ends the session on a 401', async () => {
    const { queue, session } = await load()
    drainQueue.mockRejectedValue(new DrainError(new UnauthorizedError(), new Map()))

    await queue.drain()

    expect(session.isSignedIn.value).toBe(false)
  })
})
