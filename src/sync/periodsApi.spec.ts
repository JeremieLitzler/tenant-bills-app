import { afterEach, describe, expect, it, vi } from 'vitest'

import { listPeriodIds, UnauthorizedError } from './periodsApi'

function stubProxy(status: number, body: unknown) {
  const fetchStub = vi.fn(async () => Response.json(body, { status }))
  vi.stubGlobal('fetch', fetchStub)
  return fetchStub
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listPeriodIds', () => {
  it('asks the proxy for the periods folder', async () => {
    const fetchStub = stubProxy(200, [])

    await listPeriodIds()

    expect(fetchStub).toHaveBeenCalledWith('/.netlify/functions/github-api-proxy?path=periods')
  })

  it('returns the period identifiers, sorted, from the period files only', async () => {
    stubProxy(200, [
      { name: '2026-2027.json', type: 'file' },
      { name: 'README.md', type: 'file' },
      { name: '2025-2026.json', type: 'file' },
      { name: '2024-2025.json', type: 'dir' },
    ])

    expect(await listPeriodIds()).toEqual(['2025-2026', '2026-2027'])
  })

  it('returns an empty list when the periods folder does not exist', async () => {
    stubProxy(404, { message: 'Not Found' })

    expect(await listPeriodIds()).toEqual([])
  })

  it('throws UnauthorizedError on a 401', async () => {
    stubProxy(401, { error: 'Not authenticated' })

    await expect(listPeriodIds()).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('throws on any other failure', async () => {
    stubProxy(500, { error: 'misconfigured' })

    await expect(listPeriodIds()).rejects.toThrow('500')
  })

  it('throws when the answer is not a list', async () => {
    stubProxy(200, { name: '2026-2027.json' })

    await expect(listPeriodIds()).rejects.toThrow()
  })
})
