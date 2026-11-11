// Where the OAuth functions send the visitor. Only a path of this site is accepted as a
// redirect target: no scheme, no host, no protocol-relative "//".
// The app keeps its own copy of this rule in src/lib/safeRedirect.ts; sharing one pure file is
// planned with #39 (tested against local and remote Netlify), see docs/architecture.md.
export const SIGN_IN_PATH = '/sign-in'

export type SignInError = 'not-allowed' | 'misconfigured' | 'failed'

export function signInErrorPath(error: SignInError): string {
  return `${SIGN_IN_PATH}?error=${error}`
}

export function isSafeRedirectPath(path: string | undefined | null): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}
