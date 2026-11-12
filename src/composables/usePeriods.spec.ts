import { beforeEach, describe, expect, it, vi } from 'vitest'

import { effectScope, type MaybeRefOrGetter, ref } from 'vue'

import { validPeriodJson } from '../../tests/helpers/periodFile'

const listPeriodIds = vi.fn<() => Promise<string[]>>()
const getPeriodFile = vi.fn<(id: string) => Promise<{ json: unknown; sha: string }>>()

class UnauthorizedError extends Error {}
class NotFoundError extends Error {}

vi.mock('@/sync/periodsApi', () => ({
  listPeriodIds,
  getPeriodFile,
  UnauthorizedError,
  NotFoundError,
}))

async function loadPeriods(signedInAs = 'JeremieLitzler') {
  vi.resetModules()
  document.cookie = `gh_login=${signedInAs}; Path=/`
  const { usePeriod, usePeriods } = await import('./usePeriods')
  const { useSession } = await import('./useSession')
  return { periods: usePeriods(), session: useSession(), usePeriod }
}

beforeEach(() => {
  listPeriodIds.mockReset()
  getPeriodFile.mockReset()
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('usePeriods, period list', () => {
  it('starts idle with no period', async () => {
    const { periods } = await loadPeriods()

    expect(periods.periodIds.value).toEqual([])
    expect(periods.listStatus.value).toBe('idle')
  })

  it('exposes the periods found in the data repo', async () => {
    listPeriodIds.mockResolvedValue(['2025-2026', '2026-2027'])
    const { periods } = await loadPeriods()

    await periods.loadPeriodIds()

    expect(periods.periodIds.value).toEqual(['2025-2026', '2026-2027'])
    expect(periods.listStatus.value).toBe('ready')
  })

  it('is loading while the request is pending', async () => {
    let finish: (ids: string[]) => void = () => {}
    listPeriodIds.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { periods } = await loadPeriods()

    const loading = periods.loadPeriodIds()
    expect(periods.listStatus.value).toBe('loading')
    finish([])
    await loading

    expect(periods.listStatus.value).toBe('ready')
  })

  it('shows an empty list, not an error, when there is no period', async () => {
    listPeriodIds.mockResolvedValue([])
    const { periods } = await loadPeriods()

    await periods.loadPeriodIds()

    expect(periods.periodIds.value).toEqual([])
    expect(periods.listStatus.value).toBe('ready')
  })

  it('reports an error on a failure, and keeps the session', async () => {
    listPeriodIds.mockRejectedValue(new Error('500'))
    const { periods, session } = await loadPeriods()

    await periods.loadPeriodIds()

    expect(periods.listStatus.value).toBe('error')
    expect(session.isSignedIn.value).toBe(true)
  })
})

describe('usePeriods, 401', () => {
  it('expires the session and does not redirect', async () => {
    const { UnauthorizedError: SyncUnauthorized } = await import('@/sync/periodsApi')
    listPeriodIds.mockRejectedValue(new SyncUnauthorized())
    const { periods, session } = await loadPeriods()
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })

    await periods.loadPeriodIds()

    expect(session.isSignedIn.value).toBe(false)
    expect(assign).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

// Runs `usePeriod` the way a page does, on setup, then waits for the request.
async function openPeriod(
  usePeriod: (id: MaybeRefOrGetter<string>) => ReturnType<typeof import('./usePeriods').usePeriod>,
  id: MaybeRefOrGetter<string> = '2026-2027',
) {
  const period = effectScope().run(() => usePeriod(id))!
  await vi.waitFor(() => expect(period.status.value).not.toBe('loading'))
  return period
}

describe('usePeriod', () => {
  it('is loading until the file arrives, then ready with the file and its SHA', async () => {
    let finish: (value: { json: unknown; sha: string }) => void = () => {}
    getPeriodFile.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { usePeriod } = await loadPeriods()

    const period = effectScope().run(() => usePeriod('2026-2027'))!
    expect(period.status.value).toBe('loading')
    expect(period.file.value).toBeUndefined()
    finish({ json: validPeriodJson(), sha: 'sha-1' })
    await vi.waitFor(() => expect(period.status.value).toBe('ready'))

    expect(period.file.value?.periodName).toBe('2026-2027')
    expect(period.file.value?.months).toHaveLength(12)
    expect(period.sha.value).toBe('sha-1')
    expect(period.isReadOnly.value).toBe(false)
    expect(period.problems.value).toEqual([])
  })

  it('opens a file breaking a validation rule read-only, with the problems', async () => {
    getPeriodFile.mockResolvedValue({ json: { ...validPeriodJson(), schemaVersion: 2 }, sha: 's' })
    const { usePeriod } = await loadPeriods()

    const period = await openPeriod(usePeriod)

    expect(period.status.value).toBe('ready')
    expect(period.isReadOnly.value).toBe(true)
    expect(period.problems.value).toEqual(['schema-version'])
    expect(period.file.value).toBeDefined()
  })

  it('does not fetch a loaded period again when the page is opened again', async () => {
    getPeriodFile.mockResolvedValue({ json: validPeriodJson(), sha: 's' })
    const { usePeriod } = await loadPeriods()
    await openPeriod(usePeriod)

    const again = effectScope().run(() => usePeriod('2026-2027'))!

    expect(again.status.value).toBe('ready')
    expect(again.file.value?.periodName).toBe('2026-2027')
    expect(getPeriodFile).toHaveBeenCalledTimes(1)
  })

  it('does not fetch twice when two pages ask while the first request is pending', async () => {
    getPeriodFile.mockResolvedValue({ json: validPeriodJson(), sha: 's' })
    const { usePeriod } = await loadPeriods()

    effectScope().run(() => usePeriod('2026-2027'))
    const second = await openPeriod(usePeriod)

    expect(second.status.value).toBe('ready')
    expect(getPeriodFile).toHaveBeenCalledTimes(1)
  })

  it('keeps each period apart and loads the new one when the identifier changes', async () => {
    getPeriodFile.mockImplementation(async (id) => ({ json: validPeriodJson(id), sha: id }))
    const { usePeriod } = await loadPeriods()
    const id = ref('2026-2027')
    const period = await openPeriod(usePeriod, id)

    id.value = '2025-2026'
    await vi.waitFor(() => expect(period.file.value?.periodName).toBe('2025-2026'))
    id.value = '2026-2027'

    await vi.waitFor(() => expect(period.file.value?.periodName).toBe('2026-2027'))
    expect(getPeriodFile).toHaveBeenCalledTimes(2)
  })

  it('is not found when the file does not exist', async () => {
    const { NotFoundError: SyncNotFound } = await import('@/sync/periodsApi')
    getPeriodFile.mockRejectedValue(new SyncNotFound())
    const { usePeriod, session } = await loadPeriods()

    const period = await openPeriod(usePeriod, '2031-2032')

    expect(period.status.value).toBe('not-found')
    expect(period.file.value).toBeUndefined()
    expect(session.isSignedIn.value).toBe(true)
  })

  it('is an error on a network or proxy failure, and asks again the next time', async () => {
    getPeriodFile.mockRejectedValueOnce(new Error('502'))
    getPeriodFile.mockResolvedValue({ json: validPeriodJson(), sha: 's' })
    const { usePeriod, session } = await loadPeriods()

    const failed = await openPeriod(usePeriod)
    expect(failed.status.value).toBe('error')
    expect(session.isSignedIn.value).toBe(true)
    const retried = await openPeriod(usePeriod)

    expect(retried.status.value).toBe('ready')
    expect(getPeriodFile).toHaveBeenCalledTimes(2)
  })

  it('is an error when the file is not shaped like a period file (unreadable)', async () => {
    getPeriodFile.mockResolvedValue({ json: ['nope'], sha: 's' })
    const { usePeriod } = await loadPeriods()

    const period = await openPeriod(usePeriod)

    expect(period.status.value).toBe('error')
    expect(period.file.value).toBeUndefined()
  })

  it('expires the session on a 401', async () => {
    const { UnauthorizedError: SyncUnauthorized } = await import('@/sync/periodsApi')
    getPeriodFile.mockRejectedValue(new SyncUnauthorized())
    const { usePeriod, session } = await loadPeriods()

    const period = await openPeriod(usePeriod)

    expect(period.status.value).toBe('error')
    expect(session.isSignedIn.value).toBe(false)
  })
})
