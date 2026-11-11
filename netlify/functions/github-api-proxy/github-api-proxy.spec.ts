import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildEvent, CONTEXT, expectResponse } from '../../../tests/helpers/netlify-event'
import { handler } from './github-api-proxy'

const ACCESS_TOKEN = 'gho_session_access_token_value'
const BASE = 'https://api.github.com/repos/JeremieLitzler/tenant-bills-data/contents'

function stubGithub(status = 200, body: unknown = []) {
  const fetchStub = vi.fn(async () => Response.json(body, { status }))
  vi.stubGlobal('fetch', fetchStub)
  return fetchStub
}

function getEvent(
  query: Record<string, string>,
  cookie: string | null = `gh_token=${ACCESS_TOKEN}`,
) {
  return buildEvent({
    httpMethod: 'GET',
    headers: cookie ? { cookie } : {},
    queryStringParameters: query,
  })
}

function putEvent(payload: Record<string, unknown>) {
  return buildEvent({
    httpMethod: 'PUT',
    headers: { cookie: `gh_token=${ACCESS_TOKEN}` },
    body: JSON.stringify(payload),
  })
}

function sentRequest(fetchStub: ReturnType<typeof stubGithub>) {
  const [url, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit | undefined]
  return { url, init, body: init?.body ? JSON.parse(String(init.body)) : undefined }
}

beforeEach(() => {
  vi.stubEnv('DATA_REPO', ' JeremieLitzler/tenant-bills-data\n')
  vi.stubEnv('DATA_BRANCH', ' develop\n')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('github-api-proxy, authentication', () => {
  it('answers 401 without the cookie, and never calls GitHub', async () => {
    const fetchStub = stubGithub()

    const response = expectResponse(await handler(getEvent({ path: 'periods' }, null), CONTEXT))

    expect(response.statusCode).toBe(401)
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('answers 401 and clears the token cookie when GitHub rejects the token', async () => {
    stubGithub(401, { message: 'Bad credentials' })

    const response = expectResponse(await handler(getEvent({ path: 'periods' }), CONTEXT))

    expect(response.statusCode).toBe(401)
    expect(
      (response.multiValueHeaders?.['Set-Cookie'] ?? []).some((cookie) =>
        String(cookie).startsWith('gh_token=; '),
      ),
    ).toBe(true)
  })

  it('never returns the token in the response', async () => {
    stubGithub(200, [{ name: '2026-2027.json' }])

    const response = expectResponse(await handler(getEvent({ path: 'periods' }), CONTEXT))

    expect(JSON.stringify(response)).not.toContain(ACCESS_TOKEN)
  })

  it('refuses any method but GET and PUT', async () => {
    const response = expectResponse(await handler(buildEvent({ httpMethod: 'DELETE' }), CONTEXT))

    expect(response.statusCode).toBe(405)
  })
})

describe('github-api-proxy, list and get', () => {
  it('lists the periods folder of the data repo on the configured branch', async () => {
    const fetchStub = stubGithub()

    await handler(getEvent({ path: 'periods' }), CONTEXT)

    const { url, init } = sentRequest(fetchStub)
    expect(url).toBe(`${BASE}/periods?ref=develop`)
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
  })

  it('gets one period file on the configured branch', async () => {
    const fetchStub = stubGithub(200, { sha: 'abc', content: 'e30=' })

    const response = expectResponse(
      await handler(getEvent({ path: 'periods/2026-2027.json' }), CONTEXT),
    )

    expect(sentRequest(fetchStub).url).toBe(`${BASE}/periods/2026-2027.json?ref=develop`)
    expect(JSON.parse(response.body ?? '')).toEqual({ sha: 'abc', content: 'e30=' })
  })

  it('forces the branch from DATA_BRANCH even when the client sends another', async () => {
    const fetchStub = stubGithub()

    await handler(getEvent({ path: 'periods', ref: 'main', branch: 'main' }), CONTEXT)

    expect(sentRequest(fetchStub).url).toBe(`${BASE}/periods?ref=develop`)
  })

  it('refuses another repo', async () => {
    const fetchStub = stubGithub()

    const response = expectResponse(
      await handler(getEvent({ path: 'periods', owner: 'someone', repo: 'else' }), CONTEXT),
    )

    expect(response.statusCode).toBe(403)
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('accepts the data repo named explicitly, case-insensitively', async () => {
    const fetchStub = stubGithub()

    await handler(
      getEvent({ path: 'periods', owner: 'jeremielitzler', repo: 'tenant-bills-data' }),
      CONTEXT,
    )

    expect(fetchStub).toHaveBeenCalledOnce()
  })

  it.each([
    'README.md',
    'periods/../README.md',
    '../periods',
    '/periods',
    'periodsX/a.json',
    'periods//a.json',
    'periods\\a.json',
    '',
  ])('refuses the path %j outside the periods folder', async (path) => {
    const fetchStub = stubGithub()

    const response = expectResponse(await handler(getEvent({ path }), CONTEXT))

    expect(response.statusCode).toBe(403)
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('refuses a read with no path', async () => {
    const response = expectResponse(await handler(getEvent({}), CONTEXT))

    expect(response.statusCode).toBe(403)
  })

  it('passes GitHub 404 through', async () => {
    stubGithub(404, { message: 'Not Found' })

    const response = expectResponse(await handler(getEvent({ path: 'periods' }), CONTEXT))

    expect(response.statusCode).toBe(404)
  })

  it('answers 502 when GitHub cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))

    const response = expectResponse(await handler(getEvent({ path: 'periods' }), CONTEXT))

    expect(response.statusCode).toBe(502)
  })
})

describe('github-api-proxy, put', () => {
  it('forwards a put with the sha, on the configured branch', async () => {
    const fetchStub = stubGithub(200, { content: { sha: 'new' } })

    await handler(
      putEvent({
        path: 'periods/2026-2027.json',
        message: 'data(2026-2027): 1 edit in settings',
        content: 'e30=',
        sha: 'abc',
        branch: 'main',
      }),
      CONTEXT,
    )

    const { url, init, body } = sentRequest(fetchStub)
    expect(url).toBe(`${BASE}/periods/2026-2027.json`)
    expect(init?.method).toBe('PUT')
    expect(body).toEqual({
      message: 'data(2026-2027): 1 edit in settings',
      content: 'e30=',
      sha: 'abc',
      branch: 'develop',
    })
  })

  it('forwards a put without sha to create the file', async () => {
    const fetchStub = stubGithub(201, {})

    await handler(
      putEvent({
        path: 'periods/2027-2028.json',
        message: 'data(2027-2028): create period',
        content: 'e30=',
      }),
      CONTEXT,
    )

    expect(sentRequest(fetchStub).body).toEqual({
      message: 'data(2027-2028): create period',
      content: 'e30=',
      branch: 'develop',
    })
  })

  it('refuses a put outside the periods folder', async () => {
    const fetchStub = stubGithub()

    const response = expectResponse(
      await handler(putEvent({ path: 'README.md', message: 'x', content: 'e30=' }), CONTEXT),
    )

    expect(response.statusCode).toBe(403)
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('refuses a put to the periods folder itself', async () => {
    const response = expectResponse(
      await handler(putEvent({ path: 'periods', message: 'x', content: 'e30=' }), CONTEXT),
    )

    expect(response.statusCode).toBe(403)
  })

  it('refuses a put for another repo', async () => {
    const fetchStub = stubGithub()

    const response = expectResponse(
      await handler(
        putEvent({
          owner: 'someone',
          repo: 'else',
          path: 'periods/a.json',
          message: 'x',
          content: 'e30=',
        }),
        CONTEXT,
      ),
    )

    expect(response.statusCode).toBe(403)
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('answers 400 on a malformed body', async () => {
    const response = expectResponse(
      await handler(putEvent({ path: 'periods/a.json', content: 'e30=' }), CONTEXT),
    )

    expect(response.statusCode).toBe(400)
  })

  it('passes GitHub 409 through', async () => {
    stubGithub(409, { message: 'sha does not match' })

    const response = expectResponse(
      await handler(
        putEvent({ path: 'periods/a.json', message: 'x', content: 'e30=', sha: 'stale' }),
        CONTEXT,
      ),
    )

    expect(response.statusCode).toBe(409)
  })
})

describe('github-api-proxy, configuration', () => {
  it.each([
    ['DATA_REPO', ''],
    ['DATA_REPO', 'not-owner-name'],
    ['DATA_BRANCH', ' '],
  ])('answers 500 misconfigured when %s is %j', async (name, value) => {
    vi.stubEnv(name, value)
    const fetchStub = stubGithub()

    const response = expectResponse(await handler(getEvent({ path: 'periods' }), CONTEXT))

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.body ?? '')).toEqual({ error: 'misconfigured' })
    expect(fetchStub).not.toHaveBeenCalled()
  })
})
