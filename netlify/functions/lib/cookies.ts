// Cookie parsing/building shared by all GitHub OAuth Netlify functions.
import type { HandlerEvent } from '@netlify/functions'

// Names used by more than one function.
export const STATE_COOKIE_NAME = 'gh_oauth_state'
export const REDIRECT_COOKIE_NAME = 'gh_oauth_redirect'
export const TOKEN_COOKIE_NAME = 'gh_token'
// Readable by the app (not HttpOnly): the "signed in" hint, holding only the login. The token
// cookie stays the truth; the first 401 from the proxy corrects a stale hint.
export const LOGIN_COOKIE_NAME = 'gh_login'

type SameSitePolicy = 'Strict' | 'Lax'

interface SessionCookieOptions {
  maxAgeSeconds: number
  isSecureRequest: boolean
  sameSite: SameSitePolicy
  httpOnly?: boolean
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(';')) {
    const [name, ...valueParts] = pair.trim().split('=')
    if (name) {
      cookies[name] = valueParts.join('=')
    }
  }
  return cookies
}

export function buildSessionCookie(
  name: string,
  value: string,
  options: SessionCookieOptions,
): string {
  const attributes = [
    `${name}=${value}`,
    ...(options.httpOnly === false ? [] : ['HttpOnly']),
    `SameSite=${options.sameSite}`,
    'Path=/',
    `Max-Age=${options.maxAgeSeconds}`,
  ]
  if (options.isSecureRequest) {
    attributes.push('Secure')
  }
  return attributes.join('; ')
}

// SameSite has no bearing on cookie deletion (the browser matches name/domain/path
// only), so the expired cookie always clears regardless of the policy used here.
export function buildExpiredCookie(name: string, isSecureRequest: boolean): string {
  return buildSessionCookie(name, '', { maxAgeSeconds: 0, isSecureRequest, sameSite: 'Strict' })
}

export function isHttpsRequest(event: HandlerEvent): boolean {
  return event.headers['x-forwarded-proto'] === 'https'
}
