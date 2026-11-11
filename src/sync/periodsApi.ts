// Client side of the GitHub data proxy (netlify/functions/github-api-proxy). Vue-free: it is
// reached only through the period state (src/composables/usePeriods.ts). The browser never sees
// the token and never names a repo, a branch or a folder other than `periods`.
const PROXY_PATH = '/.netlify/functions/github-api-proxy'
const PERIODS_FOLDER = 'periods'
const PERIOD_FILE_PATTERN = /^(\d{4}-\d{4})\.json$/

// The proxy answered 401: no token cookie, or GitHub rejected it.
export class UnauthorizedError extends Error {
  constructor() {
    super('Not authenticated')
    this.name = 'UnauthorizedError'
  }
}

interface FolderEntry {
  name: string
  type: string
}

// The identifiers of the period files in the data repo, e.g. ['2025-2026', '2026-2027'].
// A periods folder that does not exist yet (GitHub 404) is an empty list, not an error.
export async function listPeriodIds(): Promise<string[]> {
  const response = await fetch(`${PROXY_PATH}?path=${PERIODS_FOLDER}`)
  if (response.status === 404) {
    return []
  }
  if (response.status === 401) {
    throw new UnauthorizedError()
  }
  if (!response.ok) {
    throw new Error(`Listing the periods failed (${response.status})`)
  }
  const entries: unknown = await response.json()
  if (!Array.isArray(entries)) {
    throw new Error('Listing the periods returned something other than a list')
  }
  return (entries as FolderEntry[])
    .filter((entry) => entry.type === 'file')
    .map((entry) => PERIOD_FILE_PATTERN.exec(entry.name)?.[1])
    .filter((id): id is string => id !== undefined)
    .sort()
}
