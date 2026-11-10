// A page to return to after sign-in must be a path of this site: no scheme, no host, no "//".
export function safeRedirect(path: unknown): string | undefined {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
    ? path
    : undefined
}
