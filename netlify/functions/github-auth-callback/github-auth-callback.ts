// GET: GitHub's OAuth redirect target. Validates `state`, exchanges `code` for an access token
// server-side, reads the signed-in login, and refuses any login outside ALLOWED_LOGINS. Only an
// allowed login gets the `gh_token` session cookie (HttpOnly) and the `gh_login` hint cookie
// (readable by the app). Success redirects straight to the page the visitor asked for, or `/`;
// a refusal redirects to the sign-in page with an error code. The token never appears in a URL
// or a body.
import type { Handler, HandlerEvent } from '@netlify/functions'

import {
  buildExpiredCookie,
  buildSessionCookie,
  isHttpsRequest,
  LOGIN_COOKIE_NAME,
  parseCookies,
  REDIRECT_COOKIE_NAME,
  STATE_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from '../lib/cookies'
import {
  readAllowedLogins,
  readGithubOAuthCredentials,
  type GithubOAuthCredentials,
} from '../lib/environment'
import { jsonResponse, redirectResponse } from '../lib/http-responses'
import { isSafeRedirectPath, signInErrorPath } from '../lib/redirect'

const SESSION_MAX_AGE_SECONDS = 28800
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const isSecureRequest = isHttpsRequest(event)
  const cookies = parseCookies(event.headers.cookie)
  const roundTripCookiesCleared = [
    buildExpiredCookie(STATE_COOKIE_NAME, isSecureRequest),
    buildExpiredCookie(REDIRECT_COOKIE_NAME, isSecureRequest),
  ]
  const redirectTo = (location: string, extraCookies: string[] = []) =>
    redirectResponse(location, [...extraCookies, ...roundTripCookiesCleared])

  // Read both before anything else so a missing variable is always named in the log.
  const credentials = readGithubOAuthCredentials()
  const allowedLogins = readAllowedLogins()
  if (!credentials || !allowedLogins) {
    return redirectTo(signInErrorPath('misconfigured'))
  }

  const code = readValidatedCode(event, cookies)
  if (!code) {
    return redirectTo(signInErrorPath('failed'))
  }

  const user = await exchangeCodeForGithubUser(code, credentials)
  if (!user) {
    return redirectTo(signInErrorPath('failed'))
  }
  if (!allowedLogins.includes(user.login.toLowerCase())) {
    return redirectTo(signInErrorPath('not-allowed'))
  }

  const sessionCookies = [
    buildSessionCookie(TOKEN_COOKIE_NAME, user.accessToken, {
      maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
      isSecureRequest,
      sameSite: 'Strict',
    }),
    buildSessionCookie(LOGIN_COOKIE_NAME, encodeURIComponent(user.login), {
      maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
      isSecureRequest,
      sameSite: 'Strict',
      httpOnly: false,
    }),
  ]
  return redirectTo(readRequestedPath(cookies), sessionCookies)
}

function readValidatedCode(event: HandlerEvent, cookies: Record<string, string>): string | null {
  const params = event.queryStringParameters
  if (params?.error || !params?.code) {
    return null
  }
  const cookieState = cookies[STATE_COOKIE_NAME]
  return cookieState && cookieState === params.state ? params.code : null
}

function readRequestedPath(cookies: Record<string, string>): string {
  const requested = decodeRedirectCookie(cookies[REDIRECT_COOKIE_NAME])
  return isSafeRedirectPath(requested) ? requested : '/'
}

function decodeRedirectCookie(value: string | undefined): string | null {
  try {
    return value ? decodeURIComponent(value) : null
  } catch {
    return null
  }
}

interface GithubUser {
  login: string
  accessToken: string
}

// Two GitHub calls: the code is exchanged for a token, then the token is used to read the login.
async function exchangeCodeForGithubUser(
  code: string,
  credentials: GithubOAuthCredentials,
): Promise<GithubUser | null> {
  try {
    const accessToken = await exchangeCodeForAccessToken(code, credentials)
    if (!accessToken) {
      return null
    }
    const login = await fetchLogin(accessToken)
    return login ? { login, accessToken } : null
  } catch {
    return null
  }
}

async function exchangeCodeForAccessToken(
  code: string,
  credentials: GithubOAuthCredentials,
): Promise<string | null> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
    }),
  })
  if (!response.ok) {
    return null
  }
  // GitHub answers HTTP 200 even for a rejected code, with an error body and no access_token.
  const payload: unknown = await response.json()
  return hasStringField(payload, 'access_token') ? payload.access_token : null
}

async function fetchLogin(accessToken: string): Promise<string | null> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'tenant-bills-app',
    },
  })
  if (!response.ok) {
    return null
  }
  const payload: unknown = await response.json()
  return hasStringField(payload, 'login') ? payload.login : null
}

function hasStringField<K extends string>(payload: unknown, key: K): payload is Record<K, string> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as Record<string, unknown>)[key] === 'string'
  )
}
