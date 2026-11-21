import { mount } from '@vue/test-utils'
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
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(drainQueue).toHaveBeenCalledTimes(2))

    wrapper.unmount()
    window.dispatchEvent(new Event('online'))
    expect(drainQueue).toHaveBeenCalledTimes(2)
  })
})
