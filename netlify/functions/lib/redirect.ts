// The page to return to after sign-in travels through the OAuth round trip in a cookie.
// Only a path of this site is accepted: no scheme, no host, no protocol-relative "//".
export const REDIRECT_COOKIE_NAME = 'gh_oauth_redirect'

export function isSafeRedirectPath(path: string | undefined | null): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}
