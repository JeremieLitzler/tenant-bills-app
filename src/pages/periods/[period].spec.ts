import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPeriodFile = vi.fn<(id: string) => Promise<{ json: unknown; sha: string } | undefined>>()
const listPeriodIds = vi.fn<() => Promise<string[]>>()

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  getPeriodFile,
  listPeriodIds,
}))

const MONTHS = [
  '2026-09',
  '2026-10',
  '2026-11',
  '2026-12',
  '2027-01',
  '2027-02',
  '2027-03',
  '2027-04',
  '2027-05',
  '2027-06',
  '2027-07',
  '2027-08',
]

function periodJson(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    periodName: '2026-2027',
    settings: { monthlyTenantBillAdvance: 70 },
    months: MONTHS.map((month) => ({
      month,
      common: { tenantBillAdvance: 0 },
      waterConsumption: {},
      waterTreatment: {},
      waterSoftener: {},
      electricity: {},
      internet: {},
      heatPumpMaintenance: {},
    })),
    ...overrides,
  }
}

// Mounts the whole app at the period's address, with the real router, session and period state.
async function openPeriodPage(path = '/periods/2026-2027') {
  document.cookie = 'gh_login=JeremieLitzler; Path=/'
  const { default: router } = await import('@/router')
  const { default: App } = await import('@/App.vue')
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  return { wrapper, router }
}

beforeEach(() => {
  vi.resetModules()
  getPeriodFile.mockReset()
  listPeriodIds.mockReset()
  listPeriodIds.mockResolvedValue([])
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('period page', () => {
  it('shows a loader, then the period name and its twelve months', async () => {
    let finish: (value: { json: unknown; sha: string }) => void = () => {}
    getPeriodFile.mockReturnValue(new Promise((resolve) => (finish = resolve)))

    const { wrapper } = await openPeriodPage()
    expect(wrapper.find('[data-testid="period-loading"]').exists()).toBe(true)
    finish({ json: periodJson(), sha: 's' })
    await flushPromises()

    expect(wrapper.find('[data-testid="period-loading"]').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('2026-2027')
    const months = wrapper.findAll('[data-testid="period-months"] li')
    expect(months).toHaveLength(12)
    expect(months[0].text()).toBe('septembre 2026')
    expect(months[11].text()).toBe('août 2027')
    expect(wrapper.find('[data-testid="period-read-only"]').exists()).toBe(false)
  })

  it('does not fetch the file again when going to another page and back', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 's' })
    const { router, wrapper } = await openPeriodPage()
    await flushPromises()

    await router.push('/')
    await flushPromises()
    await router.push('/periods/2026-2027')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('2026-2027')
    expect(getPeriodFile).toHaveBeenCalledTimes(1)
  })

  it('shows the not-found state when the file does not exist', async () => {
    getPeriodFile.mockResolvedValue(undefined)

    const { wrapper } = await openPeriodPage('/periods/2031-2032')
    await flushPromises()

    expect(wrapper.get('[data-testid="period-not-found"]').text()).toBe('Période introuvable.')
    expect(wrapper.find('[data-testid="period-months"]').exists()).toBe(false)
  })

  it('shows the error state on a proxy or network error', async () => {
    getPeriodFile.mockRejectedValue(new Error('502'))

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    const error = wrapper.get('[data-testid="period-error"]')
    expect(error.attributes('role')).toBe('alert')
    expect(error.text()).toBe('Impossible de charger la période. Merci de réessayer.')
  })

  it('shows the months and a read-only notice for a file breaking a validation rule', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson({ schemaVersion: 2 }), sha: 's' })

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="period-read-only"]').text()).toContain('lecture seule')
    expect(wrapper.findAll('[data-testid="period-months"] li')).toHaveLength(12)
  })

  it('shows the error state, not a read-only notice, for a file that is not a period file', async () => {
    getPeriodFile.mockResolvedValue({ json: { hello: 'world' }, sha: 's' })

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    expect(wrapper.find('[data-testid="period-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="period-read-only"]').exists()).toBe(false)
  })

  it('shows the read-only notice, without crashing, when the month entries are malformed', async () => {
    getPeriodFile.mockResolvedValue({
      json: periodJson({ months: [null, 'x', { month: 3 }, { month: '2026-09' }] }),
      sha: 's',
    })

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="period-read-only"]').text()).toContain('lecture seule')
    expect(wrapper.findAll('[data-testid="period-months"] li')).toHaveLength(1)
  })
})
