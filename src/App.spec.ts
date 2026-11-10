import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from './App.vue'
import router from './router'

describe('App', () => {
  it('shows the French home page inside the app shell at /', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })

    const shell = wrapper.find('[data-testid="app-shell"]')
    expect(shell.exists()).toBe(true)
    expect(shell.find('main').text()).toContain('Bienvenue')
  })
})
