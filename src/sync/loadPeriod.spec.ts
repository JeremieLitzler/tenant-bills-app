import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadPeriodWithCopy } from '@/sync/loadPeriod'
import { enqueuePatch } from '@/sync/patchQueue'
import { readPeriodCopy } from '@/sync/periodCopies'

import { validPeriodJson } from '../../tests/helpers/periodFile'

const proxy = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body, { status })),
  )
const remote = () => {
  const text = JSON.stringify(validPeriodJson())
  return { content: btoa(text), sha: 'sha-remote' }
}
const queued = (value: number) =>
  enqueuePatch({ period: '2026-2027', month: '2026-09', field: 'internet.billedAmount', value })

beforeEach(() => {
  indexedDB = new IDBFactory()
})

describe('loadPeriodWithCopy', () => {
  it('returns the remote file with the queued edits, and remembers the remote as the copy', async () => {
    proxy(200, remote())
    await queued(7)

    const loaded = await loadPeriodWithCopy('2026-2027')

    expect(loaded.fromCopy).toBe(false)
    expect(loaded.sha).toBe('sha-remote')
    expect(loaded.file?.months[0].internet.billedAmount).toBe(7)
    expect((await readPeriodCopy('2026-2027'))?.sha).toBe('sha-remote')
  })

  it.each([
    [
      'a network failure',
      () =>
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => Promise.reject(new TypeError('offline'))),
        ),
    ],
    ['a 5xx', () => proxy(502)],
  ])('shows the last copy with the queued edits on %s', async (_name, fail) => {
    proxy(200, remote())
    await loadPeriodWithCopy('2026-2027')
    fail()
    await queued(9)

    const loaded = await loadPeriodWithCopy('2026-2027')

    expect(loaded.fromCopy).toBe(true)
    expect(loaded.sha).toBe('sha-remote')
    expect(loaded.file?.months[0].internet.billedAmount).toBe(9)
  })

  it('throws when the remote cannot be read and there is no copy yet', async () => {
    proxy(502)
    await expect(loadPeriodWithCopy('2026-2027')).rejects.toThrow()
  })

  it.each([401, 404])('throws on a %s even with a copy', async (status) => {
    proxy(200, remote())
    await loadPeriodWithCopy('2026-2027')
    proxy(status)
    await expect(loadPeriodWithCopy('2026-2027')).rejects.toThrow()
  })
})
