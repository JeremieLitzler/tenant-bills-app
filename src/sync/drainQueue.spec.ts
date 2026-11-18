import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Patch } from '@/domain/applyPatch'
import { drainQueue } from '@/sync/drainQueue'
import { enqueuePatch, listPatches } from '@/sync/patchQueue'

import { validPeriodJson } from '../../tests/helpers/periodFile'

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

beforeEach(async () => {
  const json = validPeriodJson()
  json.months[0].common = { tenantBillAdvance: 70 }
  Object.assign(json.months[0].internet, { billedAmount: 20.99 })
  remote = { text: serialized(json), sha: 1 }
  commits = []
  stubGithub()
  await drainQueue().catch(() => undefined) // empties what a failed test left queued
  commits = []
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
})
