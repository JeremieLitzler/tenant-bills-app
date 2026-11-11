import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function loadSession(signedInAs?: string) {
  vi.resetModules()
  document.cookie = signedInAs ? `gh_login=${signedInAs}; Path=/` : 'gh_login=; Path=/; Max-Age=0'
  return (await import('./useSession')).useSession()
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ success: true })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('useSession, start-up', () => {
  it('is signed in from the gh_login cookie, with no request to a function', async () => {
    const session = await loadSession('JeremieLitzler')

    expect(session.isSignedIn.value).toBe(true)
    expect(session.login.value).toBe('JeremieLitzler')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('is signed out without the cookie', async () => {
    const session = await loadSession()

    expect(session.isSignedIn.value).toBe(false)
    expect(session.login.value).toBeNull()
  })
})

describe('useSession, signIn', () => {
  it('goes to the start function with the requested path', async () => {
    const session = await loadSession()
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })

    session.signIn('/periods/2026-2027')

    expect(assign).toHaveBeenCalledWith(
      `/.netlify/functions/github-auth-start?redirect=${encodeURIComponent('/periods/2026-2027')}`,
    )
  })

  it('goes to the start function with no query when no path was asked', async () => {
    const session = await loadSession()
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })

    session.signIn()

    expect(assign).toHaveBeenCalledWith('/.netlify/functions/github-auth-start')
  })
})

describe('useSession, session end', () => {
  it('signOut calls the logout function, then clears the session and the cookie', async () => {
    const session = await loadSession('JeremieLitzler')

    await session.signOut()

    expect(fetch).toHaveBeenCalledWith('/.netlify/functions/github-auth-logout', { method: 'POST' })
    expect(session.isSignedIn.value).toBe(false)
    expect(document.cookie).not.toContain('gh_login=JeremieLitzler')
  })

  it('signOut still ends the local session when offline', async () => {
    const session = await loadSession('JeremieLitzler')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))

    await session.signOut()

    expect(session.isSignedIn.value).toBe(false)
  })

  it('expire ends the session without calling the logout function', async () => {
    const session = await loadSession('JeremieLitzler')

    session.expire()

    expect(session.isSignedIn.value).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks for confirmation when changes are pending, and cancelling keeps the session', async () => {
    const session = await loadSession('JeremieLitzler')
    session.setPendingCountSource(() => 2)
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)

    await session.signOut()

    expect(confirm).toHaveBeenCalledWith(
      '2 modifications pas encore enregistrées. Se déconnecter quand même ?',
    )
    expect(session.isSignedIn.value).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('signs out after the confirmation is accepted', async () => {
    const session = await loadSession('JeremieLitzler')
    session.setPendingCountSource(() => 1)
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )

    await session.signOut()

    expect(session.isSignedIn.value).toBe(false)
  })

  it('does not ask for confirmation when nothing is pending', async () => {
    const session = await loadSession('JeremieLitzler')
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)

    await session.signOut()

    expect(confirm).not.toHaveBeenCalled()
  })
})
