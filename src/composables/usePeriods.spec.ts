import { beforeEach, describe, expect, it, vi } from 'vitest'

import { effectScope, type MaybeRefOrGetter, ref } from 'vue'

import { completeMonth, validPeriodJson } from '@tests/helpers/periodFile'

const listPeriodIds = vi.fn<() => Promise<string[]>>()
const getPeriodSha = vi.fn<(id: string) => Promise<string>>()
const pendingCountFor = vi.fn<(id: string) => number>(() => 0)
const putPeriodFile = vi.fn<(...args: unknown[]) => Promise<string>>()
const getPeriodFile = vi.fn<(id: string) => Promise<{ json: unknown; sha: string }>>()

class UnauthorizedError extends Error {}
class NotFoundError extends Error {}
class MisconfiguredError extends Error {}
class PeriodExistsError extends Error {}

vi.mock('@/sync/periodsApi', () => ({
  listPeriodIds,
  getPeriodFile,
  getPeriodSha,
  putPeriodFile,
  PeriodExistsError,
  UnauthorizedError,
  NotFoundError,
  MisconfiguredError,
}))

vi.mock('@/composables/pendingPatches', () => ({ pendingCountFor, pendingCount: { value: 0 } }))

const enqueue = vi.fn<(patch: unknown) => Promise<void>>()
const drain = vi.fn<() => Promise<Map<string, string>>>()
vi.mock('@/composables/useSaveQueue', () => ({
  useSaveQueue: () => ({ enqueue, drain, syncState: { value: 'idle' } }),
}))

const listPatches = vi.fn<() => Promise<unknown[]>>()
vi.mock('@/sync/patchQueue', () => ({ listPatches }))

const readPeriodCopy = vi.fn<(id: string) => Promise<unknown>>()
const savePeriodCopy = vi.fn<(copy: unknown) => Promise<void>>()
vi.mock('@/sync/periodCopies', () => ({ readPeriodCopy, savePeriodCopy }))

const saveEstimate = vi.fn<(...args: unknown[]) => Promise<void>>()
vi.mock('@/sync/estimateCopies', () => ({
  saveEstimate,
  readEstimate: async () => undefined,
  removeEstimate: async () => {},
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
  getPeriodSha.mockReset()
  pendingCountFor.mockReset()
  pendingCountFor.mockReturnValue(0)
  enqueue.mockReset()
  enqueue.mockResolvedValue()
  drain.mockReset()
  drain.mockResolvedValue(new Map())
  listPatches.mockReset()
  listPatches.mockResolvedValue([])
  readPeriodCopy.mockReset()
  readPeriodCopy.mockResolvedValue(undefined)
  savePeriodCopy.mockReset()
  savePeriodCopy.mockResolvedValue()
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

describe('usePeriods, misconfigured proxy', () => {
  it('reports misconfigured on the list, and keeps the session', async () => {
    listPeriodIds.mockRejectedValue(new MisconfiguredError())
    const { periods, session } = await loadPeriods()

    await periods.loadPeriodIds()

    expect(periods.listStatus.value).toBe('misconfigured')
    expect(session.isSignedIn.value).toBe(true)
  })

  it('reports misconfigured on a period, and keeps the session', async () => {
    getPeriodFile.mockRejectedValue(new MisconfiguredError())
    const { usePeriod, session } = await loadPeriods()

    const period = await openPeriod(usePeriod)

    expect(period.status.value).toBe('misconfigured')
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
    getPeriodFile.mockResolvedValue({ json: { ...validPeriodJson(), schemaVersion: 1 }, sha: 's' })
    const { usePeriod } = await loadPeriods()

    const period = await openPeriod(usePeriod)

    expect(period.status.value).toBe('ready')
    expect(period.isReadOnly.value).toBe(true)
    expect(period.problems.value).toEqual(['schema-version'])
    expect(period.file.value).toBeDefined()
  })

  it('shows the last local copy with the queued edits and says so when the remote is unreachable', async () => {
    getPeriodFile.mockRejectedValue(new TypeError('Failed to fetch'))
    readPeriodCopy.mockResolvedValue({ id: '2026-2027', json: validPeriodJson(), sha: 'copy-sha' })
    listPatches.mockResolvedValue([
      { period: '2026-2027', month: '2026-09', field: 'internet.billedAmount', value: 42 },
    ])
    const { usePeriod } = await loadPeriods()
    const { useToasts } = await import('./useToasts')

    const period = await openPeriod(usePeriod)

    expect(period.status.value).toBe('ready')
    expect(period.sha.value).toBe('copy-sha')
    expect(period.file.value?.months[0].internet.billedAmount).toBe(42)
    expect(useToasts().toasts.value).toMatchObject([
      { level: 'info', message: 'Copie locale affichée.' },
    ])
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

  it('pulls the remote file silently when a page opens a held period whose SHA changed', async () => {
    getPeriodFile.mockResolvedValue({ json: validPeriodJson(), sha: 's' })
    const { usePeriod } = await loadPeriods()
    await openPeriod(usePeriod)
    getPeriodSha.mockResolvedValue('s2')
    getPeriodFile.mockResolvedValue({ json: { ...validPeriodJson(), note: 'other' }, sha: 's2' })

    const again = effectScope().run(() => usePeriod('2026-2027', { checkRemote: true }))!

    await vi.waitFor(() => expect(again.sha.value).toBe('s2'))
    expect(again.file.value).toMatchObject({ note: 'other' })
  })

  it('skips that check while edits are queued, and stays silent when it fails', async () => {
    getPeriodFile.mockResolvedValue({ json: validPeriodJson(), sha: 's' })
    const { usePeriod } = await loadPeriods()
    await openPeriod(usePeriod)
    pendingCountFor.mockReturnValue(1)
    effectScope().run(() => usePeriod('2026-2027', { checkRemote: true }))
    await Promise.resolve()
    expect(getPeriodSha).not.toHaveBeenCalled()

    pendingCountFor.mockReturnValue(0)
    getPeriodSha.mockRejectedValue(new Error('offline'))
    effectScope().run(() => usePeriod('2026-2027', { checkRemote: true }))
    await vi.waitFor(() => expect(getPeriodSha).toHaveBeenCalledTimes(1))
    const { useToasts } = await import('./useToasts')
    expect(useToasts().toasts.value).toEqual([])
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

describe('usePeriod, refresh', () => {
  async function openReady() {
    getPeriodFile.mockResolvedValue({ json: validPeriodJson(), sha: 'sha-1' })
    const { usePeriod, session } = await loadPeriods()
    return { period: await openPeriod(usePeriod), session }
  }

  it('reports up to date and downloads nothing when the SHA is unchanged', async () => {
    const { period } = await openReady()
    getPeriodSha.mockResolvedValue('sha-1')

    await period.refresh()

    expect(period.refreshStatus.value).toBe('up-to-date')
    expect(getPeriodFile).toHaveBeenCalledTimes(1)
    expect(period.sha.value).toBe('sha-1')
  })

  it('replaces the copy when the remote SHA differs', async () => {
    const { period } = await openReady()
    getPeriodSha.mockResolvedValue('sha-2')
    getPeriodFile.mockResolvedValue({
      json: { ...validPeriodJson(), note: 'changed' },
      sha: 'sha-2',
    })

    await period.refresh()

    expect(period.refreshStatus.value).toBe('updated')
    expect(period.sha.value).toBe('sha-2')
    expect(getPeriodFile).toHaveBeenCalledTimes(2)
    expect(period.file.value).toMatchObject({ note: 'changed' })
  })

  it('re-validates the new copy', async () => {
    const { period } = await openReady()
    getPeriodSha.mockResolvedValue('sha-2')
    getPeriodFile.mockResolvedValue({
      json: { ...validPeriodJson(), schemaVersion: 1 },
      sha: 'sha-2',
    })

    await period.refresh()

    expect(period.isReadOnly.value).toBe(true)
  })

  it('does nothing while edits are pending on the period', async () => {
    const { period } = await openReady()
    pendingCountFor.mockImplementation((id) => (id === '2026-2027' ? 2 : 0))

    expect(period.canRefresh.value).toBe(false)
    await period.refresh()

    expect(getPeriodSha).not.toHaveBeenCalled()
    expect(period.refreshStatus.value).toBe('idle')
  })

  it('is available once the period is ready and no edit is pending', async () => {
    const { period } = await openReady()

    expect(period.canRefresh.value).toBe(true)
  })

  it('keeps the loaded copy and reports a failure', async () => {
    const { period, session } = await openReady()
    getPeriodSha.mockRejectedValue(new Error('502'))

    await period.refresh()

    expect(period.refreshStatus.value).toBe('failed')
    expect(period.file.value?.periodName).toBe('2026-2027')
    expect(period.sha.value).toBe('sha-1')
    expect(session.isSignedIn.value).toBe(true)
  })

  it('keeps the loaded copy when the new file is not shaped like a period file', async () => {
    const { period } = await openReady()
    getPeriodSha.mockResolvedValue('sha-2')
    getPeriodFile.mockResolvedValue({ json: 'nonsense', sha: 'sha-2' })

    await period.refresh()

    expect(period.refreshStatus.value).toBe('failed')
    expect(period.sha.value).toBe('sha-1')
  })

  it('expires the session on a 401', async () => {
    const { period, session } = await openReady()
    getPeriodSha.mockRejectedValue(new UnauthorizedError())

    await period.refresh()

    expect(session.isSignedIn.value).toBe(false)
  })
})

describe('usePeriod, setCell', () => {
  async function openWritable(json: unknown = validPeriodJson()) {
    getPeriodFile.mockResolvedValue({ json, sha: 'sha-1' })
    const { usePeriod } = await loadPeriods()
    return openPeriod(usePeriod)
  }

  it('queues the patch, updates the loaded copy at once and takes the new SHA', async () => {
    const period = await openWritable()
    drain.mockResolvedValue(new Map([['2026-2027', 'sha-2']]))

    await period.setCell('2026-09', 'internet.billedAmount', 21)

    expect(enqueue).toHaveBeenCalledWith({
      period: '2026-2027',
      month: '2026-09',
      field: 'internet.billedAmount',
      value: 21,
    })
    expect(period.file.value?.months[0].internet).toEqual({ billedAmount: 21 })
    expect(period.sha.value).toBe('sha-2')
  })

  it('shows the merged file the drain wrote, with the other device edits', async () => {
    const period = await openWritable()
    const merged = validPeriodJson()
    merged.months[0].electricity = { mainBase: 1 }
    readPeriodCopy.mockResolvedValue({ id: '2026-2027', json: merged, sha: 'sha-2' })
    drain.mockResolvedValue(new Map([['2026-2027', 'sha-2']]))

    await period.setCell('2026-09', 'internet.billedAmount', 21)

    expect(period.file.value?.months[0].electricity).toEqual({ mainBase: 1 })
  })

  it('takes a top-level value with a null month', async () => {
    const period = await openWritable()

    await period.setCell(null, 'closedOn', '2027-10-11')

    expect(period.file.value?.closedOn).toBe('2027-10-11')
  })

  it('throws, and queues nothing, when the file is read-only', async () => {
    const period = await openWritable({ ...validPeriodJson(), schemaVersion: 1 })

    await expect(period.setCell('2026-09', 'internet.billedAmount', 21)).rejects.toThrow()

    expect(enqueue).not.toHaveBeenCalled()
  })

  it('throws, and queues nothing, when the period is closed', async () => {
    const period = await openWritable({ ...validPeriodJson(), closedOn: '2027-10-11' })

    await expect(period.setCell('2026-09', 'internet.billedAmount', 21)).rejects.toThrow()

    expect(enqueue).not.toHaveBeenCalled()
  })
})

describe('usePeriods, createPeriod', () => {
  const values = {
    tenantName: 'Jane Smith',
    monthlyTenantBillAdvance: 70,
    heatPumpInvoiceEstimate: 154,
    startDate: '2027-09-12',
  }

  it('creates the file without SHA, with the creation message, and lists the period', async () => {
    putPeriodFile.mockReset()
    putPeriodFile.mockResolvedValue('sha')
    listPeriodIds.mockResolvedValue(['2026-2027'])
    const { periods } = await loadPeriods()
    await periods.loadPeriodIds()

    await periods.createPeriod('2027-2028', values)

    const [id, text, sha, message] = putPeriodFile.mock.calls[0]
    expect([id, sha, message]).toEqual(['2027-2028', undefined, 'data(2027-2028): create period'])
    expect(JSON.parse(text as string)).toMatchObject({
      periodName: '2027-2028',
      months: [{ month: '2027-09', heatPumpMaintenance: { billedAmount: 12.83 } }],
    })
    expect(periods.periodIds.value).toEqual(['2026-2027', '2027-2028'])
  })

  it('refuses an existing period and leaves the list unchanged', async () => {
    putPeriodFile.mockReset()
    putPeriodFile.mockRejectedValue(new PeriodExistsError())
    listPeriodIds.mockResolvedValue(['2026-2027'])
    const { periods } = await loadPeriods()
    await periods.loadPeriodIds()

    await expect(periods.createPeriod('2026-2027', values)).rejects.toBeInstanceOf(
      PeriodExistsError,
    )
    expect(periods.periodIds.value).toEqual(['2026-2027'])
  })
})

describe('usePeriod, initializeNextMonth', () => {
  function elevenMonths() {
    const json = validPeriodJson()
    const months = json.months.slice(0, 11).map((m) => completeMonth(m.month))
    months[10].common.endDate = '2027-08-15'
    Object.assign(json, { months })
    return json
  }
  async function open(json: unknown) {
    getPeriodFile.mockImplementation(async (id) => {
      if (id === '2026-2027') return { json, sha: 'sha-1' }
      throw new NotFoundError()
    })
    const { usePeriod } = await loadPeriods()
    return openPeriod(usePeriod)
  }

  it('offers the next month once the last one is complete, and none when it is not', async () => {
    expect((await open(elevenMonths())).nextMonth.value).toBe('available')
    const incomplete = elevenMonths()
    incomplete.months[10].internet = {}
    expect((await open(incomplete)).nextMonth.value).toBe('incomplete')
  })

  it('offers nothing after the twelfth month', async () => {
    const twelve = validPeriodJson()
    twelve.months = twelve.months.map((m) => completeMonth(m.month))
    expect((await open(twelve)).nextMonth.value).toBe('none')
  })

  it('queues the new month as one patch, estimated when it is the twelfth', async () => {
    const period = await open(elevenMonths())

    await period.initializeNextMonth()

    const [patch] = enqueue.mock.calls.at(-1) as [{ month: string; field: string; value: unknown }]
    expect(patch.field).toBe('month')
    expect(patch.month).toBe('2027-08')
    expect((patch.value as { common: { estimated?: boolean } }).common.estimated).toBe(true)
    expect(saveEstimate).toHaveBeenCalledOnce()
    expect(saveEstimate.mock.calls[0].slice(0, 2)).toEqual(['2026-2027', '2027-08'])
    expect(period.file.value?.months).toHaveLength(12)
  })

  it('tells the failure and queues nothing when the previous period cannot be read', async () => {
    getPeriodFile.mockImplementation(async (id) => {
      if (id === '2026-2027') return { json: elevenMonths(), sha: 'sha-1' }
      throw new Error('network')
    })
    const { usePeriod } = await loadPeriods()
    const period = await openPeriod(usePeriod)
    enqueue.mockClear()

    await period.initializeNextMonth()

    expect(enqueue).not.toHaveBeenCalled()
  })

  it.each([
    ['2026-2027', '2025-2026'],
    ['2026-2026', '2025-2025'],
  ])('reads %s previous period as %s', async (id, previous) => {
    const json = elevenMonths()
    getPeriodFile.mockImplementation(async (requested) => {
      if (requested === id) return { json, sha: 'sha-1' }
      throw new NotFoundError()
    })
    const { usePeriod } = await loadPeriods()
    const period = await openPeriod(usePeriod, id)

    await period.initializeNextMonth()

    expect(getPeriodFile).toHaveBeenCalledWith(previous)
  })

  it('does not read the period itself as its previous one for an unusual id', async () => {
    getPeriodFile.mockResolvedValue({ json: elevenMonths(), sha: 'sha-1' })
    const { usePeriod } = await loadPeriods()
    const period = await openPeriod(usePeriod, '2026-2028')

    await period.initializeNextMonth()

    expect(getPeriodFile).toHaveBeenCalledTimes(1)
    expect(enqueue).toHaveBeenCalled()
  })

  it('offers nothing on a closed or a read-only period', async () => {
    const closed = { ...elevenMonths(), closedOn: '2027-10-11' }
    expect((await open(closed)).nextMonth.value).toBe('none')
    expect((await open({ ...elevenMonths(), schemaVersion: 1 })).nextMonth.value).toBe('none')
  })
})
