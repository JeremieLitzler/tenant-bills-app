import { beforeEach, describe, expect, it, vi } from 'vitest'

const listPeriodIds = vi.fn<() => Promise<string[]>>()

class UnauthorizedError extends Error {}

vi.mock('@/sync/periodsApi', () => ({ listPeriodIds, UnauthorizedError }))

async function loadPeriods(signedInAs = 'JeremieLitzler') {
  vi.resetModules()
  document.cookie = `gh_login=${signedInAs}; Path=/`
  const { usePeriods } = await import('./usePeriods')
  const { useSession } = await import('./useSession')
  return { periods: usePeriods(), session: useSession() }
}

beforeEach(() => {
  listPeriodIds.mockReset()
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
