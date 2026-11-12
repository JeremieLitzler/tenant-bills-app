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

// The proxy answered 404 for a period file: it does not exist in the data repo.
export class NotFoundError extends Error {
  constructor() {
    super('Not found')
    this.name = 'NotFoundError'
  }
}

// The proxy answered 500 `misconfigured`: DATA_REPO or DATA_BRANCH is missing or malformed. The
// variable is named in the function log only, so nothing here can say which one.
export class MisconfiguredError extends Error {
  constructor() {
    super('The data proxy is misconfigured')
    this.name = 'MisconfiguredError'
  }
}

async function failFor(response: Response, what: string): Promise<never> {
  if (response.status === 500) {
    const answer: unknown = await response.json().catch(() => undefined)
    if ((answer as { error?: unknown } | undefined)?.error === 'misconfigured') {
      throw new MisconfiguredError()
    }
  }
  throw new Error(`${what} failed (${response.status})`)
}

interface FolderEntry {
  name: string
  type: string
  sha?: unknown
}

async function readPeriodsFolder(): Promise<FolderEntry[] | undefined> {
  const response = await fetch(`${PROXY_PATH}?path=${PERIODS_FOLDER}`)
  if (response.status === 404) {
    return undefined
  }
  if (response.status === 401) {
    throw new UnauthorizedError()
  }
  if (!response.ok) {
    return failFor(response, 'Listing the periods')
  }
  const entries: unknown = await response.json()
  if (!Array.isArray(entries)) {
    throw new Error('Listing the periods returned something other than a list')
  }
  return entries as FolderEntry[]
}

// The identifiers of the period files in the data repo, e.g. ['2025-2026', '2026-2027'].
// A periods folder that does not exist yet (GitHub 404) is an empty list, not an error.
export async function listPeriodIds(): Promise<string[]> {
  const entries = (await readPeriodsFolder()) ?? []
  return entries
    .filter((entry) => entry.type === 'file')
    .map((entry) => PERIOD_FILE_PATTERN.exec(entry.name)?.[1])
    .filter((id): id is string => id !== undefined)
    .sort()
}

// The SHA of one period file in the data repo, read from the folder listing so the file itself is
// not downloaded. Throws NotFoundError when the file is not listed.
export async function getPeriodSha(id: string): Promise<string> {
  const entries = (await readPeriodsFolder()) ?? []
  const entry = entries.find((candidate) => candidate.name === `${id}.json`)
  if (!entry) {
    throw new NotFoundError()
  }
  if (typeof entry.sha !== 'string') {
    throw new Error(`Listing the periods returned no SHA for ${id}`)
  }
  return entry.sha
}

export interface PeriodFileContent {
  // The parsed JSON, not yet validated (src/domain/validatePeriodFile.ts).
  json: unknown
  // Kept for later writes: a PUT without it would overwrite a newer version.
  sha: string
}

interface ContentsFile {
  sha?: unknown
  content?: unknown
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

// One period file and its SHA. Throws NotFoundError when the file does not exist (GitHub 404).
export async function getPeriodFile(id: string): Promise<PeriodFileContent> {
  const response = await fetch(`${PROXY_PATH}?path=${PERIODS_FOLDER}/${id}.json`)
  if (response.status === 404) {
    throw new NotFoundError()
  }
  if (response.status === 401) {
    throw new UnauthorizedError()
  }
  if (!response.ok) {
    return failFor(response, `Loading the period ${id}`)
  }
  const answer = (await response.json()) as ContentsFile
  if (typeof answer?.content !== 'string' || typeof answer.sha !== 'string') {
    throw new Error(`Loading the period ${id} returned something other than a file`)
  }
  return { json: JSON.parse(decodeBase64Utf8(answer.content)), sha: answer.sha }
}
