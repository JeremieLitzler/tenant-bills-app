// GET/PUT: forwards three operations to the GitHub Contents API of the data repo, with the token
// from the `gh_token` cookie (docs/environment-variables.md):
//   GET ?path=periods                      list the periods folder
//   GET ?path=periods/2026-2027.json       get one period file (content and SHA)
//   PUT { path, message, content, sha? }   put one period file (no SHA creates it)
// Only the repo named by DATA_REPO and paths under `periods/` are accepted, and the branch always
// comes from DATA_BRANCH (`ref` on reads, `branch` on writes): whatever the client sends is ignored.
// GitHub's 404 and 409 are passed through; a 401 clears the dead token cookie.
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions'

import { buildExpiredCookie, isHttpsRequest, parseCookies, TOKEN_COOKIE_NAME } from '../lib/cookies'
import { type DataTarget, readDataTarget } from '../lib/environment'
import { jsonResponse } from '../lib/http-responses'

const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_ACCEPT_HEADER = 'application/vnd.github+json'
const USER_AGENT = 'tenant-bills-app/1.0'
const PERIODS_FOLDER = 'periods'

interface WritePayload {
  owner?: string
  repo?: string
  path: string
  message: string
  content: string
  sha?: string
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'PUT') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const accessToken = parseCookies(event.headers.cookie)[TOKEN_COOKIE_NAME]
  if (!accessToken) {
    return jsonResponse(401, { error: 'Not authenticated' })
  }

  const target = readDataTarget()
  if (!target) {
    return jsonResponse(500, { error: 'misconfigured' })
  }

  const isSecureRequest = isHttpsRequest(event)
  if (event.httpMethod === 'GET') {
    const { owner, repo, path } = event.queryStringParameters ?? {}
    const refusal = refuseOutsideDataRepo(target, owner, repo, path, true)
    if (refusal) {
      return refusal
    }
    const url = `${contentsUrl(target, path as string)}?ref=${encodeURIComponent(target.branch)}`
    return forward(url, { headers: githubHeaders(accessToken) }, isSecureRequest)
  }

  const payload = parseWritePayload(event.body)
  if (!payload) {
    return jsonResponse(400, { error: 'Missing path, message or content' })
  }
  const refusal = refuseOutsideDataRepo(target, payload.owner, payload.repo, payload.path, false)
  if (refusal) {
    return refusal
  }
  const body: Record<string, string> = {
    message: payload.message,
    content: payload.content,
    branch: target.branch,
  }
  if (payload.sha) {
    body.sha = payload.sha
  }
  return forward(
    contentsUrl(target, payload.path),
    {
      method: 'PUT',
      headers: { ...githubHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    isSecureRequest,
  )
}

function refuseOutsideDataRepo(
  target: DataTarget,
  owner: string | undefined,
  repo: string | undefined,
  path: string | undefined,
  allowFolder: boolean,
): HandlerResponse | null {
  const namesOtherRepo =
    (owner !== undefined && owner.toLowerCase() !== target.owner.toLowerCase()) ||
    (repo !== undefined && repo.toLowerCase() !== target.repo.toLowerCase())
  if (namesOtherRepo) {
    return jsonResponse(403, { error: 'Repository not allowed' })
  }
  if (!isPeriodsPath(path, allowFolder)) {
    return jsonResponse(403, { error: 'Path not allowed' })
  }
  return null
}

// `periods/<file>` (and, for a read, the folder `periods` itself). Every segment must be
// non-empty and free of "." / ".." and backslashes, so no path can climb out of the folder.
function isPeriodsPath(path: string | undefined, allowFolder: boolean): path is string {
  if (typeof path !== 'string' || path.includes('\\')) {
    return false
  }
  const [folder, ...rest] = path.split('/')
  if (folder !== PERIODS_FOLDER) {
    return false
  }
  if (rest.length === 0) {
    return allowFolder
  }
  return rest.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

function parseWritePayload(body: string | null): WritePayload | null {
  if (!body) {
    return null
  }
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return null
  }
  if (typeof payload !== 'object' || payload === null) {
    return null
  }
  const candidate = payload as Record<string, unknown>
  const isString = (value: unknown) => typeof value === 'string'
  const isOptionalString = (value: unknown) => value === undefined || isString(value)
  if (
    !isString(candidate.path) ||
    !isString(candidate.message) ||
    !isString(candidate.content) ||
    !isOptionalString(candidate.sha) ||
    !isOptionalString(candidate.owner) ||
    !isOptionalString(candidate.repo)
  ) {
    return null
  }
  return candidate as unknown as WritePayload
}

// Percent-encoding each segment keeps a value from escaping the /repos/{owner}/{repo}/contents shape.
function contentsUrl(target: DataTarget, path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const repoUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`
  return `${repoUrl}/contents/${encodedPath}`
}

function githubHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: GITHUB_ACCEPT_HEADER,
    'User-Agent': USER_AGENT,
  }
}

async function forward(
  url: string,
  init: RequestInit,
  isSecureRequest: boolean,
): Promise<HandlerResponse> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    return jsonResponse(502, { error: 'Unable to reach GitHub' })
  }
  if (response.status === 401) {
    return jsonResponse(401, { error: 'GitHub access token is invalid or expired' }, [
      buildExpiredCookie(TOKEN_COOKIE_NAME, isSecureRequest),
    ])
  }
  const body = await response.json().catch(() => ({}))
  return jsonResponse(response.status, body)
}
