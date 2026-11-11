// A page to return to after sign-in must be a path of this site: no scheme, no host, no "//".
// The Netlify functions keep their own copy in netlify/functions/lib/redirect.ts; sharing one pure
// file is planned with #39 (tested against local and remote Netlify).
export function safeRedirect(path: unknown): string | undefined {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
    ? path
    : undefined
}
