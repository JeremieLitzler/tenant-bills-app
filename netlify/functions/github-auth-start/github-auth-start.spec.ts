import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildEvent, CONTEXT, expectResponse, setCookies } from '../lib/testing'
import { handler } from './github-auth-start'

beforeEach(() => {
  vi.stubEnv('GITHUB_OAUTH_CLIENT_ID', 'test-client-id')
  vi.stubEnv('GITHUB_OAUTH_CLIENT_SECRET', 'test-client-secret')
  vi.stubEnv('URL', 'http://localhost:8888')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('github-auth-start', () => {
  it('redirects to GitHub with the client ID, the repo scope, a state and the callback URL', async () => {
    const response = expectResponse(await handler(buildEvent(), CONTEXT))

    expect(response.statusCode).toBe(302)
    const location = new URL(String(response.headers?.Location))
    expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(location.searchParams.get('client_id')).toBe('test-client-id')
    expect(location.searchParams.get('scope')).toBe('repo')
    expect(location.searchParams.get('state')).toBeTruthy()
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://localhost:8888/.netlify/functions/github-auth-callback',
    )
  })

  it('stores the same state in a short-lived Lax cookie', async () => {
    const response = expectResponse(await handler(buildEvent(), CONTEXT))

    const state = new URL(String(response.headers?.Location)).searchParams.get('state')
    expect(setCookies(response)).toContain(
      `gh_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300`,
    )
  })

  it('carries the requested page through the round trip in a short-lived cookie', async () => {
    const event = buildEvent({ queryStringParameters: { redirect: '/periods/2026-2027' } })

    const response = expectResponse(await handler(event, CONTEXT))

    expect(setCookies(response)).toContain(
      `gh_oauth_redirect=${encodeURIComponent('/periods/2026-2027')}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300`,
    )
  })

  it.each(['https://evil.example/', '//evil.example/', 'periods', ''])(
    'drops a redirect that is not a path of this site: %j',
    async (redirect) => {
      const event = buildEvent({ queryStringParameters: { redirect } })

      const response = expectResponse(await handler(event, CONTEXT))

      expect(setCookies(response).some((c) => c.startsWith('gh_oauth_redirect='))).toBe(false)
    },
  )

  it('trims the credentials read from the environment', async () => {
    vi.stubEnv('GITHUB_OAUTH_CLIENT_ID', 'test-client-id\n')

    const response = expectResponse(await handler(buildEvent(), CONTEXT))

    const location = new URL(String(response.headers?.Location))
    expect(location.searchParams.get('client_id')).toBe('test-client-id')
  })

  it.each(['GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET'])(
    'refuses to start when %s is missing, names it only in the log',
    async (name) => {
      vi.stubEnv(name, '  ')
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})

      const response = expectResponse(await handler(buildEvent(), CONTEXT))

      expect(response.statusCode).toBe(302)
      expect(response.headers?.Location).toBe('/sign-in?error=misconfigured')
      expect(JSON.stringify(response)).not.toContain(name)
      expect(log).toHaveBeenCalledWith(expect.stringContaining(name))
    },
  )

  it('refuses any method but GET', async () => {
    const response = expectResponse(await handler(buildEvent({ httpMethod: 'POST' }), CONTEXT))

    expect(response.statusCode).toBe(405)
  })
})
