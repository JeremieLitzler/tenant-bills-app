import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

import { beforeEach, describe, expect, it } from 'vitest'

import { readPeriodCopy, savePeriodCopy } from '@/sync/periodCopies'
import { enqueuePatch, listPatches } from '@/sync/patchQueue'

beforeEach(() => {
  indexedDB = new IDBFactory()
})

describe('periodCopies', () => {
  it('returns the last saved copy of a period, undefined for an unknown one', async () => {
    await savePeriodCopy({ id: '2026-2027', json: { a: 1 }, sha: 's1' })
    await savePeriodCopy({ id: '2026-2027', json: { a: 2 }, sha: 's2' })
    expect(await readPeriodCopy('2026-2027')).toEqual({
      id: '2026-2027',
      json: { a: 2 },
      sha: 's2',
    })
    expect(await readPeriodCopy('2025-2026')).toBeUndefined()
  })

  it('lives beside the patch queue', async () => {
    await enqueuePatch({ period: '2026-2027', month: null, field: 'closedOn', value: 'x' })
    await savePeriodCopy({ id: '2026-2027', json: {}, sha: 's' })
    expect(await listPatches()).toHaveLength(1)
  })
})
