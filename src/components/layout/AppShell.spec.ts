import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function mountShell(path: string) {
  vi.resetModules()
  document.cookie = 'gh_login=JeremieLitzler; Path=/'
  const { default: router } = await import('@/router')
  const { useSession } = await import('@/composables/useSession')
  const { default: AppShell } = await import('./AppShell.vue')
  await router.push(path)
  const wrapper = mount(AppShell, { global: { plugins: [router] } })
  return { wrapper, router, session: useSession() }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('AppShell, session end', () => {
  it('shows the login and the sign-out button while signed in', async () => {
    const { wrapper } = await mountShell('/')

    expect(wrapper.get('[data-testid="session-login"]').text()).toBe('JeremieLitzler')
    expect(wrapper.get('button').text()).toContain('Se déconnecter')
  })

  it('sends the visitor to the sign-in page, remembering the current path, when the session expires', async () => {
    const { router, session } = await mountShell('/')

    session.expire()

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/sign-in'))
    expect(router.currentRoute.value.query.redirect).toBe('/')
  })

  it('"Se déconnecter" ends on the sign-in page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true })),
    )
    const { wrapper, router } = await mountShell('/')

    await wrapper.get('button').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/sign-in'))
  })

  it('puts the sync badge in main, not in the header', async () => {
    const { wrapper } = await mountShell('/')

    expect(wrapper.find('main [data-testid="sync-badge"]').exists()).toBe(true)
    expect(wrapper.find('header [data-testid="sync-badge"]').exists()).toBe(false)
  })

  it('hides the sync badge once the visitor is signed out', async () => {
    const { wrapper, session } = await mountShell('/')

    session.expire()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="sync-badge"]').exists()).toBe(false)
  })

  it('links the app name to the home page', async () => {
    const { wrapper } = await mountShell('/')
    expect(wrapper.get('[data-testid="app-name"]').attributes('href')).toBe('/')
  })
})
