import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('App', () => {
  beforeEach(() => {
    vi.resetModules()
    document.cookie = 'gh_login=JeremieLitzler; Path=/'
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
})
