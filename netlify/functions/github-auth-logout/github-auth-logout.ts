// POST: clears the `gh_token` and `gh_login` cookies. Succeeds even if it was already absent.
// Queued edits live in IndexedDB and are never touched here.
import type { Handler, HandlerEvent } from '@netlify/functions'

import {
  buildExpiredCookie,
  isHttpsRequest,
  LOGIN_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from '../lib/cookies'
import { jsonResponse } from '../lib/http-responses'

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const isSecureRequest = isHttpsRequest(event)
  return jsonResponse(200, { success: true }, [
    buildExpiredCookie(TOKEN_COOKIE_NAME, isSecureRequest),
    buildExpiredCookie(LOGIN_COOKIE_NAME, isSecureRequest),
  ])
}
