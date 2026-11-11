// The `gh_login` cookie is set by the callback function next to the HttpOnly token. It holds
// only the GitHub login (not a secret) so the app can tell synchronously, even offline, who was
// last signed in. It is a hint: the token cookie is the truth, and the first 401 corrects it.
const LOGIN_COOKIE_NAME = 'gh_login'

export function readLoginCookie(): string | null {
  for (const pair of document.cookie.split(';')) {
    const [name, ...valueParts] = pair.trim().split('=')
    if (name === LOGIN_COOKIE_NAME) {
      const value = decodeLogin(valueParts.join('='))
      return value === '' ? null : value
    }
  }
  return null
}

export function clearLoginCookie(): void {
  document.cookie = `${LOGIN_COOKIE_NAME}=; Path=/; Max-Age=0`
}

function decodeLogin(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}
