import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listPeriodIds = vi.fn<() => Promise<string[]>>()

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  listPeriodIds,
}))

// Mounts the whole app at /periods, with the real router, session and period state.
async function mountApp() {
  document.cookie = 'gh_login=JeremieLitzler; Path=/'
  const { default: router } = await import('@/router')
  const { default: App } = await import('@/App.vue')
  await router.push('/periods')
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.resetModules()
  listPeriodIds.mockReset()
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('period list page', () => {
  it('shows each period identifier with a link to it', async () => {
    listPeriodIds.mockResolvedValue(['2025-2026', '2026-2027'])

    const { wrapper } = await mountApp()

    const links = wrapper.findAll('main a')
    expect(links.map((link) => link.text())).toEqual(['2025-2026', '2026-2027'])
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/periods/2025-2026',
      '/periods/2026-2027',
    ])
  })

  it('shows an empty list, not an error, when the periods folder is absent', async () => {
    listPeriodIds.mockResolvedValue([])

    const { wrapper } = await mountApp()

    expect(wrapper.find('[data-testid="periods-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="periods-error"]').exists()).toBe(false)
  })

  it('shows an error when the list cannot be read', async () => {
    listPeriodIds.mockRejectedValue(new Error('500'))

    const { wrapper } = await mountApp()

    expect(wrapper.find('[data-testid="periods-error"]').exists()).toBe(true)
  })

  it('ends on the sign-in page, remembering the path, after a 401', async () => {
    const { UnauthorizedError } = await import('@/sync/periodsApi')
    listPeriodIds.mockRejectedValue(new UnauthorizedError())

    const { router } = await mountApp()

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/sign-in'))
    expect(router.currentRoute.value.query.redirect).toBe('/periods')
  })
})
