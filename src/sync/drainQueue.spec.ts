import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type Patch, patchKey } from '@/domain/applyPatch'
import { DrainError, drainQueue, setEditedAfterCloseListener } from '@/sync/drainQueue'
import { enqueuePatch, listPatches } from '@/sync/patchQueue'
import { UnauthorizedError } from '@/sync/periodsApi'

import { validPeriodJson } from '@tests/helpers/periodFile'

// A stateful GitHub Contents API fake, stubbed at `fetch` behind the proxy.
let remote: { text: string; sha: number }
let commits: string[]

function stubGithub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) {
        const content = btoa(String.fromCharCode(...new TextEncoder().encode(remote.text)))
        return Response.json({ content, sha: `sha${remote.sha}` })
      }
      const body = JSON.parse(init.body as string)
      if (body.sha !== `sha${remote.sha}`) return new Response('{}', { status: 409 })
      remote = {
        text: new TextDecoder().decode(Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0))),
        sha: remote.sha + 1,
      }
      commits.push(body.message)
      return Response.json({ content: { sha: `sha${remote.sha}` } })
    }),
  )
}

const serialized = (json: unknown) => `${JSON.stringify(json, null, 2)}\n`
const cell = (field: string, value: unknown, month: string | null = '2026-09'): Patch => ({
  period: '2026-2027',
  month,
  field,
  value,
})
const remoteFile = () => JSON.parse(remote.text)
const otherPeriod = (field: string, value: unknown): Patch => ({
  period: '2025-2026',
  month: '2025-09',
  field,
  value,
})

beforeEach(async () => {
  const json = validPeriodJson()
  json.months[0].common = { tenantBillAdvance: 70 }
  Object.assign(json.months[0].internet, { billedAmount: 20.99 })
  remote = { text: serialized(json), sha: 1 }
  commits = []
  stubGithub()
  indexedDB = new IDBFactory() // an empty queue for every test
})

describe('drainQueue', () => {
  it('writes one typed cell as one commit', async () => {
    await enqueuePatch(cell('electricity.mainBase', 71697.08))
    await drainQueue()
    expect(remoteFile().months[0].electricity).toEqual({ mainBase: 71697.08 })
    expect(commits).toEqual(['data(2026-2027): 1 edit in 2026-09'])
    expect(await listPatches()).toEqual([])
  })

  it('removes a key with null, and sets an emptied tenant bill advance to 0', async () => {
    await enqueuePatch(cell('internet.billedAmount', null))
    await enqueuePatch(cell('common.tenantBillAdvance', null))
    await drainQueue()
    expect(remoteFile().months[0].internet).toEqual({})
    expect(remoteFile().months[0].common).toEqual({ tenantBillAdvance: 0 })
    expect(commits).toEqual(['data(2026-2027): 2 edits in 2026-09'])
  })

  it('writes a settings patch', async () => {
    await enqueuePatch(cell('closedOn', '2027-10-11', null))
    await drainQueue()
    expect(remoteFile().closedOn).toBe('2027-10-11')
    expect(commits).toEqual(['data(2026-2027): 1 edit in settings'])
  })

  it('sends a retyped cell once', async () => {
    await enqueuePatch(cell('internet.billedAmount', 21))
    await enqueuePatch(cell('internet.billedAmount', 22))
    await drainQueue()
    expect(remoteFile().months[0].internet.billedAmount).toBe(22)
    expect(commits).toEqual(['data(2026-2027): 1 edit in 2026-09'])
  })

  it('appends an initialized month and never overwrites an existing one', async () => {
    const json = remoteFile()
    json.months = json.months.slice(0, 1)
    remote.text = serialized(json)
    const month = validPeriodJson().months[1]
    await enqueuePatch(cell('month', month, '2026-10'))
    await enqueuePatch(cell('month', { ...month, month: '2026-09' }, '2026-09'))
    await drainQueue()
    expect(remoteFile().months.map((m: { month: string }) => m.month)).toEqual([
      '2026-09',
      '2026-10',
    ])
    expect(remoteFile().months[0].common).toEqual({ tenantBillAdvance: 70 })
  })

  it('writes identical bytes when nothing changes, and one line when a cell does', async () => {
    const before = remote.text
    await enqueuePatch(cell('internet.billedAmount', 20.99))
    await drainQueue()
    expect(remote.text).toBe(before)
    await enqueuePatch(cell('internet.billedAmount', 25))
    await drainQueue()
    const lines = before.split('\n')
    const changed = remote.text.split('\n').filter((line, i) => line !== lines[i])
    expect(changed).toEqual(['        "billedAmount": 25'])
  })

  it('keeps the queue when the write fails', async () => {
    await enqueuePatch(cell('internet.billedAmount', 30))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    )
    await expect(drainQueue()).rejects.toThrow()
    expect(await listPatches()).toHaveLength(1)
  })

  it('drains the other periods when one fails, and says what was written', async () => {
    const github = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) =>
        url.includes('2025-2026') ? new Response('{}', { status: 500 }) : github(url, init),
      ),
    )
    const failing = otherPeriod('internet.billedAmount', 1)
    await enqueuePatch(failing)
    await enqueuePatch(cell('internet.billedAmount', 22))

    const error = await drainQueue().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(DrainError)
    expect((error as DrainError).written).toEqual(new Map([['2026-2027', 'sha2']]))
    expect(remoteFile().months[0].internet.billedAmount).toBe(22)
    expect(await listPatches()).toEqual([failing])
  })

  it('makes one PUT and one commit per period file', async () => {
    const puts: string[] = []
    const github = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method) puts.push(JSON.parse(init.body as string).path)
        return github(url, init)
      }),
    )
    await enqueuePatch(cell('internet.billedAmount', 22))
    await enqueuePatch(otherPeriod('internet.billedAmount', 1))
    await drainQueue()
    expect(puts).toHaveLength(2)
    expect(puts.some((url) => url.includes('2025-2026'))).toBe(true)
    expect(commits.sort()).toEqual([
      'data(2025-2026): 1 edit in 2025-09',
      'data(2026-2027): 1 edit in 2026-09',
    ])
  })

  it('keeps every patch queued on a network error', async () => {
    await enqueuePatch(cell('internet.billedAmount', 30))
    await enqueuePatch(otherPeriod('internet.billedAmount', 1))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(drainQueue()).rejects.toThrow()
    expect(await listPatches()).toHaveLength(2)
  })

  it('keeps every patch queued on a 401 and throws it, so the session ends', async () => {
    await enqueuePatch(cell('internet.billedAmount', 30))
    await enqueuePatch(otherPeriod('internet.billedAmount', 1))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Not authenticated' }, { status: 401 })),
    )
    const error = await drainQueue().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DrainError)
    expect((error as DrainError).cause).toBeInstanceOf(UnauthorizedError)
    expect(await listPatches()).toHaveLength(2)
  })

  it('does not start a second PUT when called during a drain', async () => {
    await enqueuePatch(cell('internet.billedAmount', 30))
    const first = drainQueue()
    const second = drainQueue()
    expect(second).toBe(first)
    await first
    expect(commits).toHaveLength(1)
  })

  it('sends a patch added during a drain in the next PUT, once the first ends', async () => {
    await enqueuePatch(cell('internet.billedAmount', 30))
    const github = globalThis.fetch
    let added = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method && !added) {
          added = true
          await enqueuePatch(cell('electricity.mainBase', 5))
        }
        return github(url, init)
      }),
    )
    await drainQueue()
    expect(commits).toEqual([
      'data(2026-2027): 1 edit in 2026-09',
      'data(2026-2027): 1 edit in 2026-09',
    ])
    expect(remoteFile().months[0].electricity).toEqual({ mainBase: 5 })
    expect(await listPatches()).toEqual([])
  })

  // The other device writes the file between our GET and our PUT, `times` times.
  function otherDeviceWritesFirst(
    times: number,
    edit: (json: ReturnType<typeof remoteFile>) => void,
  ) {
    const github = globalThis.fetch
    let left = times
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method && left-- > 0) {
          const json = remoteFile()
          edit(json)
          remote = { text: serialized(json), sha: remote.sha + 1 }
        }
        return github(url, init)
      }),
    )
  }

  it('on a 409, pulls, re-applies the patches and retries once with the same message', async () => {
    otherDeviceWritesFirst(1, (json) => {
      json.months[0].electricity = { mainBase: 1 }
      json.months[0].internet.billedAmount = 99
    })
    await enqueuePatch(cell('internet.billedAmount', 22))
    await enqueuePatch(cell('electricity.mainExtra', 5))
    await drainQueue()
    const month = remoteFile().months[0]
    expect(month.electricity).toEqual({ mainBase: 1, mainExtra: 5 })
    expect(month.internet.billedAmount).toBe(22) // the queued value wins
    expect(commits).toEqual(['data(2026-2027): 2 edits in 2026-09'])
    expect(await listPatches()).toEqual([])
  })

  it('counts the patches sent even when the other device wrote the same value', async () => {
    otherDeviceWritesFirst(1, (json) => {
      json.months[0].internet.billedAmount = 22
    })
    await enqueuePatch(cell('internet.billedAmount', 22))
    await drainQueue()
    expect(commits).toEqual(['data(2026-2027): 1 edit in 2026-09'])
  })

  it('keeps the patches and throws on a second 409', async () => {
    otherDeviceWritesFirst(2, (json) => {
      json.months[0].internet.billedAmount = 99
    })
    await enqueuePatch(cell('internet.billedAmount', 22))
    const error = await drainQueue().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DrainError)
    expect(commits).toEqual([])
    expect(await listPatches()).toHaveLength(1)
  })

  it('applies a patch to a closed period and flags it', async () => {
    const json = remoteFile()
    json.closedOn = '2027-10-11'
    remote.text = serialized(json)
    const told = vi.fn()
    setEditedAfterCloseListener(told)
    await enqueuePatch(cell('internet.billedAmount', 22))
    await drainQueue()
    expect(remoteFile().months[0].internet.billedAmount).toBe(22)
    expect(told).toHaveBeenCalledWith([patchKey(cell('internet.billedAmount', 22))])
  })
})
