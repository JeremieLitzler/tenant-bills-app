// Reads the five environment variables of docs/environment-variables.md.
// Every value is trimmed (a pasted trailing newline broke the reference project twice).
// A missing or empty variable returns null and is named in the function log only,
// never in a response: the public site reveals nothing about its configuration.
export interface GithubOAuthCredentials {
  clientId: string
  clientSecret: string
}

export function readGithubOAuthCredentials(): GithubOAuthCredentials | null {
  const clientId = readVariable('GITHUB_OAUTH_CLIENT_ID')
  const clientSecret = readVariable('GITHUB_OAUTH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return null
  }
  return { clientId, clientSecret }
}

// Lower-cased logins: GitHub logins are case-insensitive.
export function readAllowedLogins(): string[] | null {
  const raw = readVariable('ALLOWED_LOGINS')
  if (!raw) {
    return null
  }
  const logins = raw
    .split(',')
    .map((login) => login.trim().toLowerCase())
    .filter((login) => login !== '')
  if (logins.length === 0) {
    console.error('Missing environment variable ALLOWED_LOGINS (no login in the list)')
    return null
  }
  return logins
}

export interface DataTarget {
  owner: string
  repo: string
  branch: string
}

// The only repo and branch the proxy talks to. `DATA_REPO` must be `owner/name`.
export function readDataTarget(): DataTarget | null {
  const repository = readVariable('DATA_REPO')
  const branch = readVariable('DATA_BRANCH')
  if (!repository || !branch) {
    return null
  }
  const [owner, repo, ...rest] = repository.split('/')
  if (!owner || !repo || rest.length > 0) {
    console.error('Malformed environment variable DATA_REPO (expected owner/name)')
    return null
  }
  return { owner, repo, branch }
}

function readVariable(name: string): string | null {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`Missing environment variable ${name}`)
    return null
  }
  return value
}
