import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadRouter(signedInAs?: string) {
  vi.resetModules()
  document.cookie = signedInAs ? `gh_login=${signedInAs}; Path=/` : 'gh_login=; Path=/; Max-Age=0'
  return (await import('./index')).default
}

beforeEach(() => {
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('route guard', () => {
  it('sends a signed-out visitor to the sign-in page, remembering the asked path', async () => {
    const router = await loadRouter()

    await router.push('/')

    expect(router.currentRoute.value.path).toBe('/sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/')
  })

  it('lets a signed-in visitor through', async () => {
    const router = await loadRouter('JeremieLitzler')

    await router.push('/')

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('shows the sign-in page to a signed-out visitor', async () => {
    const router = await loadRouter()

    await router.push('/sign-in?error=not-allowed')

    expect(router.currentRoute.value.path).toBe('/sign-in')
  })

  it('sends a signed-in visitor away from the sign-in page, to the asked path or home', async () => {
    const router = await loadRouter('JeremieLitzler')

    await router.push('/sign-in?redirect=%2Fperiods')
    expect(router.currentRoute.value.fullPath).toBe('/periods')

    await router.push('/sign-in')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('ignores a redirect that is not a path of this site', async () => {
    const router = await loadRouter('JeremieLitzler')

    await router.push('/sign-in?redirect=%2F%2Fevil.example')

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('keeps showing the sign-in page when it has an error, even if signed in', async () => {
    const router = await loadRouter('JeremieLitzler')

    await router.push('/sign-in?error=failed')

    expect(router.currentRoute.value.path).toBe('/sign-in')
  })
})
