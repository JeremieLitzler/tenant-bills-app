import { afterEach, describe, expect, it, vi } from 'vitest'

import { getPeriodFile, listPeriodIds, NotFoundError, UnauthorizedError } from './periodsApi'

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

// GitHub wraps the base64 content at 60 characters, with newlines.
function toBase64(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)))
}

function githubFile(json: unknown, sha = 'abc123') {
  const base64 = toBase64(JSON.stringify(json))
  return { sha, encoding: 'base64', content: base64.replace(/(.{60})/g, '$1\n') }
}

describe('getPeriodFile', () => {
  it('asks the proxy for the period file', async () => {
    const fetchStub = stubProxy(200, githubFile({}))

    await getPeriodFile('2026-2027')

    expect(fetchStub).toHaveBeenCalledWith(
      '/.netlify/functions/github-api-proxy?path=periods/2026-2027.json',
    )
  })

  it('returns the decoded JSON and the SHA', async () => {
    stubProxy(200, githubFile({ periodName: '2026-2027', note: 'été' }, 'sha-1'))

    expect(await getPeriodFile('2026-2027')).toEqual({
      json: { periodName: '2026-2027', note: 'été' },
      sha: 'sha-1',
    })
  })

  it('throws NotFoundError when the file does not exist', async () => {
    stubProxy(404, { message: 'Not Found' })

    await expect(getPeriodFile('2031-2032')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws UnauthorizedError on a 401', async () => {
    stubProxy(401, { error: 'Not authenticated' })

    await expect(getPeriodFile('2026-2027')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('throws on any other failure', async () => {
    stubProxy(502, { error: 'bad gateway' })

    await expect(getPeriodFile('2026-2027')).rejects.toThrow('502')
  })

  it('throws when the content is not JSON', async () => {
    stubProxy(200, {
      sha: 'x',
      encoding: 'base64',
      content: toBase64('not json'),
    })

    await expect(getPeriodFile('2026-2027')).rejects.toThrow()
  })

  it('throws when the answer has no content or SHA', async () => {
    stubProxy(200, [{ name: '2026-2027.json' }])

    await expect(getPeriodFile('2026-2027')).rejects.toThrow()
  })
})
