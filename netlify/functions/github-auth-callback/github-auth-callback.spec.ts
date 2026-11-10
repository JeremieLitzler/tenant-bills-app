import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildEvent, CONTEXT, expectResponse, setCookies } from '../lib/testing'
import { handler } from './github-auth-callback'

const STATE = 'matching-state-value'
const ACCESS_TOKEN = 'gho_secret_access_token_value'
const CLIENT_SECRET = 'super-secret-client-secret'

// GitHub answers two calls: the code exchange, then the lookup of the signed-in login.
function stubGithub(login = 'JeremieLitzler', { exchangeOk = true, userOk = true } = {}) {
  const fetchStub = vi.fn(async (url: string | URL | Request) => {
    const target = String(url)
    if (target === 'https://github.com/login/oauth/access_token') {
      return exchangeOk
        ? Response.json({ access_token: ACCESS_TOKEN })
        : Response.json({ error: 'bad_verification_code' })
    }
    if (target === 'https://api.github.com/user') {
      return userOk ? Response.json({ login }) : new Response('{}', { status: 401 })
    }
    throw new Error(`unexpected fetch ${target}`)
  })
  vi.stubGlobal('fetch', fetchStub)
  return fetchStub
}

function callbackEvent(cookies = `gh_oauth_state=${STATE}`, state = STATE) {
  return buildEvent({
    headers: { cookie: cookies },
    queryStringParameters: { code: 'valid-code', state },
  })
}

function hasLiveTokenCookie(cookies: string[]): boolean {
  return cookies.some((cookie) => cookie.startsWith('gh_token=') && !cookie.includes('Max-Age=0'))
}

beforeEach(() => {
  vi.stubEnv('GITHUB_OAUTH_CLIENT_ID', 'test-client-id')
  vi.stubEnv('GITHUB_OAUTH_CLIENT_SECRET', CLIENT_SECRET)
  vi.stubEnv('ALLOWED_LOGINS', 'JeremieLitzler')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('github-auth-callback, allowed login', () => {
  it('redirects to the sign-in page with the login and sets the token cookie', async () => {
    stubGithub()

    const response = expectResponse(await handler(callbackEvent(), CONTEXT))

    expect(response.statusCode).toBe(302)
    expect(response.headers?.Location).toBe('/sign-in?signed-in=JeremieLitzler')
    expect(
      setCookies(response).some(
        (cookie) =>
          cookie.startsWith(`gh_token=${ACCESS_TOKEN}; `) &&
          cookie.includes('HttpOnly') &&
          cookie.includes('SameSite=Strict') &&
          cookie.includes('Max-Age=28800'),
      ),
    ).toBe(true)
  })

  it('marks the token cookie Secure on an https request', async () => {
    stubGithub()
    const event = callbackEvent()
    event.headers['x-forwarded-proto'] = 'https'

    const response = expectResponse(await handler(event, CONTEXT))

    expect(setCookies(response).find((c) => c.startsWith('gh_token='))).toContain('; Secure')
  })

  it('hands the requested page back to the sign-in page and clears the round-trip cookies', async () => {
    stubGithub()
    const cookies = `gh_oauth_state=${STATE}; gh_oauth_redirect=${encodeURIComponent('/periods/2026-2027')}`

    const response = expectResponse(await handler(callbackEvent(cookies), CONTEXT))

    expect(response.headers?.Location).toBe(
      `/sign-in?signed-in=JeremieLitzler&redirect=${encodeURIComponent('/periods/2026-2027')}`,
    )
    const cleared = setCookies(response).filter((c) => c.includes('Max-Age=0'))
    expect(cleared.some((c) => c.startsWith('gh_oauth_state=; '))).toBe(true)
    expect(cleared.some((c) => c.startsWith('gh_oauth_redirect=; '))).toBe(true)
  })

  it('ignores a redirect cookie that is not a path of this site', async () => {
    stubGithub()
    const cookies = `gh_oauth_state=${STATE}; gh_oauth_redirect=${encodeURIComponent('//evil.example')}`

    const response = expectResponse(await handler(callbackEvent(cookies), CONTEXT))

    expect(response.headers?.Location).toBe('/sign-in?signed-in=JeremieLitzler')
  })

  it.each([
    ['another capitalisation', 'jeremielitzler', 'JeremieLitzler'],
    ['spaces around entries', 'JeremieLitzler', ' someone , JeremieLitzler '],
  ])('accepts the login despite %s', async (_label, githubLogin, allowed) => {
    vi.stubEnv('ALLOWED_LOGINS', allowed)
    stubGithub(githubLogin)

    const response = expectResponse(await handler(callbackEvent(), CONTEXT))

    expect(response.headers?.Location).toBe(`/sign-in?signed-in=${githubLogin}`)
  })
})

describe('github-auth-callback, refusals', () => {
  it('refuses a GitHub login outside the allowlist and sets no token cookie', async () => {
    stubGithub('someone-else')

    const response = expectResponse(await handler(callbackEvent(), CONTEXT))

    expect(response.headers?.Location).toBe('/sign-in?error=not-allowed')
    expect(hasLiveTokenCookie(setCookies(response))).toBe(false)
  })

  it.each([
    ['ALLOWED_LOGINS', ''],
    ['ALLOWED_LOGINS', ' , '],
    ['GITHUB_OAUTH_CLIENT_ID', ''],
    ['GITHUB_OAUTH_CLIENT_SECRET', '  '],
  ])(
    'fails closed as misconfigured when %s is %j, naming it only in the log',
    async (name, value) => {
      vi.stubEnv(name, value)
      const fetchStub = stubGithub()

      const response = expectResponse(await handler(callbackEvent(), CONTEXT))

      expect(response.headers?.Location).toBe('/sign-in?error=misconfigured')
      expect(JSON.stringify(response)).not.toContain(name)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining(name))
      expect(fetchStub).not.toHaveBeenCalled()
    },
  )

  it('redirects to a generic failure when the user denies access', async () => {
    const event = buildEvent({ queryStringParameters: { error: 'access_denied' } })

    const response = expectResponse(await handler(event, CONTEXT))

    expect(response.headers?.Location).toBe('/sign-in?error=failed')
    expect(hasLiveTokenCookie(setCookies(response))).toBe(false)
  })

  it('refuses a state that does not match the cookie', async () => {
    const fetchStub = stubGithub()

    const response = expectResponse(await handler(callbackEvent(undefined, 'other-state'), CONTEXT))

    expect(response.headers?.Location).toBe('/sign-in?error=failed')
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('fails when GitHub rejects the code', async () => {
    stubGithub('JeremieLitzler', { exchangeOk: false })

    const response = expectResponse(await handler(callbackEvent(), CONTEXT))

    expect(response.headers?.Location).toBe('/sign-in?error=failed')
  })

  it('fails when the login cannot be read from GitHub', async () => {
    stubGithub('JeremieLitzler', { userOk: false })

    const response = expectResponse(await handler(callbackEvent(), CONTEXT))

    expect(response.headers?.Location).toBe('/sign-in?error=failed')
  })

  it('refuses any method but GET', async () => {
    const response = expectResponse(await handler(buildEvent({ httpMethod: 'POST' }), CONTEXT))

    expect(response.statusCode).toBe(405)
  })
})

describe('github-auth-callback, secrets', () => {
  it('never places the token or the client secret in a redirect URL or body', async () => {
    stubGithub()

    const response = expectResponse(await handler(callbackEvent(), CONTEXT))

    expect(String(response.headers?.Location)).not.toContain(ACCESS_TOKEN)
    expect(response.body ?? '').not.toContain(ACCESS_TOKEN)
    expect(JSON.stringify(response)).not.toContain(CLIENT_SECRET)
  })
})
