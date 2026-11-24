import { flushPromises, mount } from '@vue/test-utils'
import { validPeriodJson } from '@tests/helpers/periodFile'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listPeriodIds = vi.fn<() => Promise<string[]>>()

const closedOn = new Set<string>()
const getPeriodFile = vi.fn(async (id: string) => ({
  json: {
    ...validPeriodJson(id),
    ...(closedOn.has(id) ? { closedOn: '2026-09-12' } : {}),
    months: validPeriodJson(id).months.slice(0, elevenMonths.has(id) ? 11 : monthCount),
  },
  sha: 'sha',
}))

const putPeriodFile = vi.fn(async () => 'sha')
let monthCount = 12
const elevenMonths = new Set<string>()

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  listPeriodIds,
  getPeriodFile,
  putPeriodFile,
}))

// Mounts the whole app at /, with the real router, session and period state.
async function mountApp() {
  document.cookie = 'gh_login=JeremieLitzler; Path=/'
  const { default: router } = await import('@/router')
  const { default: App } = await import('@/App.vue')
  await router.push('/')
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.resetModules()
  monthCount = 12
  elevenMonths.clear()
  putPeriodFile.mockClear()
  listPeriodIds.mockReset()
  closedOn.clear()
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('PeriodList on the home page', () => {
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

  it('shows a closed period as closed and the others, two at once, as open', async () => {
    closedOn.add('2025-2026')
    listPeriodIds.mockResolvedValue(['2025-2026', '2026-2027', '2027-2028'])

    const { wrapper } = await mountApp()

    await vi.waitFor(() => {
      const statuses = wrapper.findAll('[data-testid="period-status"]').map((s) => s.text())
      expect(statuses).toEqual(['Clôturée', 'Ouverte', 'Ouverte'])
    })
  })

  it('shows an empty list, not an error, when the periods folder is absent', async () => {
    listPeriodIds.mockResolvedValue([])

    const { wrapper } = await mountApp()

    expect(wrapper.find('[data-testid="periods-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="periods-retry"]').exists()).toBe(false)
  })

  it('shows an error toast and a "Réessayer" button that loads the list again', async () => {
    listPeriodIds.mockRejectedValueOnce(new Error('500'))

    const { wrapper } = await mountApp()

    expect(wrapper.get('[data-testid="toast"]').text()).toContain('Impossible de charger')
    expect(wrapper.get('[data-testid="toast"]').attributes('role')).toBe('alert')
    listPeriodIds.mockResolvedValue(['2026-2027'])
    await wrapper.get('[data-testid="periods-retry"]').trigger('click')
    await flushPromises()

    expect(listPeriodIds).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="periods-retry"]').exists()).toBe(false)
    expect(wrapper.get('main a').text()).toBe('2026-2027')
  })

  it('ends on the sign-in page, remembering the path, after a 401', async () => {
    const { UnauthorizedError } = await import('@/sync/periodsApi')
    listPeriodIds.mockRejectedValue(new UnauthorizedError())

    const { router } = await mountApp()

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/sign-in'))
    expect(router.currentRoute.value.query.redirect).toBe('/')
  })
})

describe('PeriodList with a misconfigured proxy', () => {
  it('shows an error toast with a Netlify link', async () => {
    const { MisconfiguredError } = await import('@/sync/periodsApi')
    listPeriodIds.mockRejectedValue(new MisconfiguredError())

    const { wrapper } = await mountApp()

    const notice = wrapper.get('[data-testid="toast"]')
    expect(notice.attributes('role')).toBe('alert')
    expect(notice.get('a').attributes('href')).toBe('https://app.netlify.com/')
    expect(notice.text()).not.toMatch(/DATA_|MisconfiguredError/)
  })
})

describe('PeriodList, "Nouvelle période"', () => {
  const button = (w: Awaited<ReturnType<typeof mountApp>>['wrapper']) =>
    w.get('[data-testid="new-period"]')

  it('is allowed without a previous period', async () => {
    listPeriodIds.mockResolvedValue([])
    const { wrapper } = await mountApp()
    expect(button(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('is refused with the reason while the previous twelfth month does not exist', async () => {
    monthCount = 11
    listPeriodIds.mockResolvedValue(['2026-2027'])
    const { wrapper } = await mountApp()
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="new-period-reason"]').exists()).toBe(true),
    )
    expect(button(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="new-period-reason"]').text()).toContain('douzième mois')
  })

  it('creates the period from the form and opens it', async () => {
    listPeriodIds.mockResolvedValue(['2026-2027'])
    const { wrapper, router } = await mountApp()
    await vi.waitFor(() => expect(button(wrapper).attributes('disabled')).toBeUndefined())
    await button(wrapper).trigger('click')
    await wrapper.get('input[name="tenantName"]').setValue('Jane Smith')
    await wrapper.get('input[name="monthlyTenantBillAdvance"]').setValue('80')
    await wrapper.get('input[name="startDate"]').setValue('2027-09-15')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const [id, , sha, message] = putPeriodFile.mock.calls[0] as unknown as string[]
    expect([id, sha, message]).toEqual(['2027-2028', undefined, 'data(2027-2028): create period'])
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/periods/2027-2028'))
  })

  it('refuses an existing period with a toast, and does not open it', async () => {
    const { PeriodExistsError } = await import('@/sync/periodsApi')
    putPeriodFile.mockRejectedValueOnce(new PeriodExistsError())
    listPeriodIds.mockResolvedValue([])
    const { wrapper, router } = await mountApp()
    await button(wrapper).trigger('click')
    await wrapper.get('input[name="tenantName"]').setValue('Jane')
    await wrapper.get('input[name="monthlyTenantBillAdvance"]').setValue('80')
    await wrapper.get('input[name="startDate"]').setValue('2026-09-15')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="toast"]').text()).toContain('existe déjà')
    expect(router.currentRoute.value.path).toBe('/')
  })

  async function fillAndSubmit(
    wrapper: Awaited<ReturnType<typeof mountApp>>['wrapper'],
    date: string,
    advance = '80',
  ) {
    await button(wrapper).trigger('click')
    await wrapper.get('input[name="tenantName"]').setValue('Jane')
    await wrapper.get('input[name="monthlyTenantBillAdvance"]').setValue(advance)
    await wrapper.get('input[name="startDate"]').setValue(date)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
  }

  it('names the wrong field in the toast', async () => {
    listPeriodIds.mockResolvedValue([])
    const { wrapper } = await mountApp()
    await fillAndSubmit(wrapper, '2026-09-15', '0')
    expect(wrapper.get('[data-testid="toast"]').text()).toContain('acompte mensuel')
    expect(putPeriodFile).not.toHaveBeenCalled()
  })

  it('refuses when the period of the year before has no twelfth month', async () => {
    elevenMonths.add('2025-2026')
    listPeriodIds.mockResolvedValue(['2024-2025'])
    const { wrapper } = await mountApp()
    await vi.waitFor(() => expect(button(wrapper).attributes('disabled')).toBeUndefined())
    await fillAndSubmit(wrapper, '2026-09-15')
    expect(wrapper.get('[data-testid="toast"]').text()).toContain('douzième mois')
    expect(putPeriodFile).not.toHaveBeenCalled()
  })

  it('hints that the advance cannot be suggested when the previous figures are incomplete', async () => {
    listPeriodIds.mockResolvedValue(['2026-2027'])
    const { wrapper } = await mountApp()
    await vi.waitFor(() => expect(button(wrapper).attributes('disabled')).toBeUndefined())
    await button(wrapper).trigger('click')
    expect(wrapper.find('[data-testid="new-period-prefill-hint"]').exists()).toBe(true)
  })

  it('says it is checking while the list loads, with the button disabled', async () => {
    listPeriodIds.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountApp()
    expect(wrapper.get('[data-testid="new-period-checking"]').text()).toContain('Vérification')
    expect(button(wrapper).attributes('disabled')).toBeDefined()
  })
})
