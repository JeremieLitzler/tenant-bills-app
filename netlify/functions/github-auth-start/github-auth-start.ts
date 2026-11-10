// GET: starts the GitHub OAuth flow. Generates a CSRF `state`, keeps it (and the page the
// visitor asked for) in short-lived cookies, and redirects to GitHub's authorize page.
import type { Handler, HandlerEvent } from '@netlify/functions'
import { randomUUID } from 'node:crypto'

import { buildSessionCookie, isHttpsRequest } from '../lib/cookies'
import { readGithubOAuthCredentials } from '../lib/environment'
import { jsonResponse, redirectResponse } from '../lib/http-responses'
import { isSafeRedirectPath, REDIRECT_COOKIE_NAME } from '../lib/redirect'

const OAUTH_SCOPE = 'repo'
const STATE_COOKIE_NAME = 'gh_oauth_state'
const ROUND_TRIP_COOKIE_MAX_AGE_SECONDS = 300
const CALLBACK_PATH = '/.netlify/functions/github-auth-callback'
const MISCONFIGURED_PATH = '/sign-in?error=misconfigured'

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const credentials = readGithubOAuthCredentials()
  if (!credentials) {
    return redirectResponse(MISCONFIGURED_PATH)
  }

  const redirectUri = buildCallbackRedirectUri(event)
  if (!redirectUri) {
    return redirectResponse(MISCONFIGURED_PATH)
  }

  const state = randomUUID()
  const authorizeUrl = buildAuthorizeUrl(credentials.clientId, redirectUri, state)
  // `Lax`, not `Strict`: GitHub's redirect back to the callback is a cross-site top-level
  // GET navigation, and a `Strict` cookie is withheld on that hop.
  const cookieOptions = {
    maxAgeSeconds: ROUND_TRIP_COOKIE_MAX_AGE_SECONDS,
    isSecureRequest: isHttpsRequest(event),
    sameSite: 'Lax',
  } as const
  const cookies = [buildSessionCookie(STATE_COOKIE_NAME, state, cookieOptions)]

  const redirect = event.queryStringParameters?.redirect
  if (isSafeRedirectPath(redirect)) {
    cookies.push(
      buildSessionCookie(REDIRECT_COOKIE_NAME, encodeURIComponent(redirect), cookieOptions),
    )
  }

  return redirectResponse(authorizeUrl, cookies)
}

function buildCallbackRedirectUri(event: HandlerEvent): string | null {
  const siteUrl = process.env.URL?.trim() || deriveOriginFromEvent(event)
  return siteUrl ? `${siteUrl}${CALLBACK_PATH}` : null
}

// `process.env.URL` covers Netlify (dev and prod, including local http). The fallback never
// guesses an insecure origin: an unconfirmed-https request is refused, not defaulted to http.
function deriveOriginFromEvent(event: HandlerEvent): string | null {
  return isHttpsRequest(event) ? `https://${event.headers.host}` : null
}

function buildAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', OAUTH_SCOPE)
  url.searchParams.set('state', state)
  return url.toString()
}
