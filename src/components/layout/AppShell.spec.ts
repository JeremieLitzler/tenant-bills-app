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

  it('shows the count of queued edits and the sync state on every route', async () => {
    const { wrapper } = await mountShell('/')
    const { setPendingCounts } = await import('@/composables/pendingPatches')

    expect(wrapper.get('[data-testid="sync-state"]').text()).toBe('À jour')
    expect(wrapper.get('[data-testid="sync-pending"]').text()).toBe(
      'Aucune modification en attente',
    )

    setPendingCounts({ a: 1 })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="sync-pending"]').text()).toBe('1 modification en attente')

    setPendingCounts({ a: 2, b: 1 })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="sync-pending"]').text()).toBe('3 modifications en attente')

    window.dispatchEvent(new Event('offline'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="sync-state"]').text()).toBe('Hors ligne')
    window.dispatchEvent(new Event('online'))
  })

  it('puts the sync badge in main, not in the header', async () => {
    const { wrapper } = await mountShell('/')

    expect(wrapper.find('main [data-testid="sync-badge"]').exists()).toBe(true)
    expect(wrapper.find('header [data-testid="sync-badge"]').exists()).toBe(false)
  })

  it('links the app name to the home page', async () => {
    const { wrapper } = await mountShell('/')
    expect(wrapper.get('[data-testid="app-name"]').attributes('href')).toBe('/')
  })
})
