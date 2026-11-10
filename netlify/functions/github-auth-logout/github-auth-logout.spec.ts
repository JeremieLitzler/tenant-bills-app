import { describe, expect, it } from 'vitest'

import { buildEvent, CONTEXT, expectResponse, setCookies } from '../lib/testing'
import { handler } from './github-auth-logout'

describe('github-auth-logout', () => {
  it('clears the gh_token cookie when one is present', async () => {
    const event = buildEvent({
      httpMethod: 'POST',
      headers: { cookie: 'gh_token=gho_existing_token' },
    })

    const response = expectResponse(await handler(event, CONTEXT))

    expect(response.statusCode).toBe(200)
    expect(
      setCookies(response).some(
        (cookie) => cookie.startsWith('gh_token=; ') && cookie.includes('Max-Age=0'),
      ),
    ).toBe(true)
  })

  it('succeeds when the gh_token cookie was already absent', async () => {
    const response = expectResponse(await handler(buildEvent({ httpMethod: 'POST' }), CONTEXT))

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body ?? '{}')).toEqual({ success: true })
  })

  it('refuses any method but POST', async () => {
    const response = expectResponse(await handler(buildEvent({ httpMethod: 'GET' }), CONTEXT))

    expect(response.statusCode).toBe(405)
  })
})
