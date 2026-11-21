import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('App', () => {
  beforeEach(() => {
    vi.resetModules()
    document.cookie = 'gh_login=JeremieLitzler; Path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([])),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the French home page inside the app shell at /', async () => {
    const { default: App } = await import('./App.vue')
    const { default: router } = await import('./router')
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })

    const shell = wrapper.find('[data-testid="app-shell"]')
    expect(shell.exists()).toBe(true)
    expect(shell.find('main').text()).toContain('Bienvenue')
    expect(shell.find('[data-testid="session-login"]').text()).toBe('JeremieLitzler')
  })

  it('reads the queued edits into the badge on load, even when signed out', async () => {
    document.cookie = 'gh_login=; Path=/; Max-Age=0'
    vi.doMock('@/sync/patchQueue', () => ({
      listPatches: async () => [{ period: 'a' }, { period: 'a' }],
    }))
    const { default: App } = await import('./App.vue')
    const { pendingCount } = await import('@/composables/pendingPatches')
    const { default: router } = await import('./router')
    await router.push('/sign-in')
    await router.isReady()

    mount(App, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(pendingCount.value).toBe(2))
  })

  it('drains the queue on load and when the browser comes back online, only when signed in', async () => {
    const drainQueue = vi.fn(async () => new Map<string, string>())
    vi.doMock('@/sync/drainQueue', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/sync/drainQueue')>()),
      drainQueue,
    }))
    vi.doMock('@/sync/patchQueue', () => ({ listPatches: async () => [] }))
    const { default: App } = await import('./App.vue')
    const { default: router } = await import('./router')
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })
    await vi.waitFor(() => expect(drainQueue).toHaveBeenCalledTimes(1))
    window.dispatchEvent(new Event('offline'))
    await nextTick()
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(drainQueue).toHaveBeenCalledTimes(2))

    wrapper.unmount()
    window.dispatchEvent(new Event('offline'))
    await nextTick()
    window.dispatchEvent(new Event('online'))
    await nextTick()
    expect(drainQueue).toHaveBeenCalledTimes(2)
  })
})
