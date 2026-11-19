import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getPeriodFile,
  getPeriodSha,
  listPeriodIds,
  MisconfiguredError,
  NotFoundError,
  PeriodExistsError,
  putPeriodFile,
  UnauthorizedError,
} from './periodsApi'

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
    stubProxy(500, { error: 'boom' })

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

describe('getPeriodSha', () => {
  const listing = [
    { name: '2025-2026.json', type: 'file', sha: 'sha-old' },
    { name: '2026-2027.json', type: 'file', sha: 'sha-new' },
  ]

  it('reads the SHA from the periods folder, without downloading the file', async () => {
    const fetchStub = stubProxy(200, listing)

    expect(await getPeriodSha('2026-2027')).toBe('sha-new')
    expect(fetchStub).toHaveBeenCalledTimes(1)
    expect(fetchStub).toHaveBeenCalledWith('/.netlify/functions/github-api-proxy?path=periods')
  })

  it('throws NotFoundError when the period is not listed', async () => {
    stubProxy(200, listing)

    await expect(getPeriodSha('2031-2032')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws NotFoundError when the periods folder does not exist', async () => {
    stubProxy(404, { message: 'Not Found' })

    await expect(getPeriodSha('2026-2027')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws UnauthorizedError on a 401', async () => {
    stubProxy(401, { error: 'Not authenticated' })

    await expect(getPeriodSha('2026-2027')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('throws when the entry carries no SHA', async () => {
    stubProxy(200, [{ name: '2026-2027.json', type: 'file' }])

    await expect(getPeriodSha('2026-2027')).rejects.toThrow()
  })
})

describe('a misconfigured proxy', () => {
  it.each([
    ['listPeriodIds', () => listPeriodIds()],
    ['getPeriodSha', () => getPeriodSha('2026-2027')],
    ['getPeriodFile', () => getPeriodFile('2026-2027')],
  ])('%s throws MisconfiguredError on the misconfigured 500', async (_name, call) => {
    stubProxy(500, { error: 'misconfigured' })

    await expect(call()).rejects.toBeInstanceOf(MisconfiguredError)
  })

  it('does not take any other 500 for a misconfiguration', async () => {
    stubProxy(500, { error: 'boom' })

    await expect(listPeriodIds()).rejects.not.toBeInstanceOf(MisconfiguredError)
  })
})

describe('putPeriodFile, creation', () => {
  it('sends a PUT without SHA and the given message', async () => {
    const fetchStub = stubProxy(201, { content: { sha: 'new' } })

    await expect(
      putPeriodFile('2027-2028', '{}', undefined, 'data(2027-2028): create period'),
    ).resolves.toBe('new')

    const init = (fetchStub.mock.calls[0] as unknown as [string, RequestInit])[1]
    const sent = JSON.parse(init.body as string)
    expect(init.method).toBe('PUT')
    expect(sent).toEqual({
      path: 'periods/2027-2028.json',
      message: 'data(2027-2028): create period',
      content: btoa('{}'),
    })
  })

  it('refuses an existing file (GitHub 422)', async () => {
    stubProxy(422, { message: 'sha was not supplied' })

    await expect(putPeriodFile('2026-2027', '{}', undefined, 'x')).rejects.toBeInstanceOf(
      PeriodExistsError,
    )
  })
})
