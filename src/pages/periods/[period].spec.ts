import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validPeriodJson } from '../../../tests/helpers/periodFile'

const getPeriodFile = vi.fn<(id: string) => Promise<{ json: unknown; sha: string } | undefined>>()
const getPeriodSha = vi.fn<(id: string) => Promise<string>>()
const pendingCountFor = vi.fn<(id: string) => number>(() => 0)
const listPeriodIds = vi.fn<() => Promise<string[]>>()

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  getPeriodFile,
  getPeriodSha,
  listPeriodIds,
}))

vi.mock('@/composables/pendingPatches', () => ({ pendingCountFor }))

function periodJson(overrides: Record<string, unknown> = {}) {
  return { ...validPeriodJson(), ...overrides }
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
  getPeriodSha.mockReset()
  pendingCountFor.mockReset()
  pendingCountFor.mockReturnValue(0)
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

  it('shows the months and a read-only notice for a file breaking a validation rule', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson({ schemaVersion: 2 }), sha: 's' })

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="period-read-only"]').text()).toContain('lecture seule')
    expect(wrapper.findAll('[data-testid="period-months"] li')).toHaveLength(12)
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

  describe('Rafraîchir', () => {
    it("shows the other device's changes when the remote file differs", async () => {
      getPeriodFile.mockResolvedValueOnce({ json: periodJson(), sha: 'sha-1' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      getPeriodSha.mockResolvedValue('sha-2')
      getPeriodFile.mockResolvedValue({
        json: periodJson({ months: periodJson().months.slice(0, 11) }),
        sha: 'sha-2',
      })

      await wrapper.get('[data-testid="period-refresh"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="period-refresh-result"]').text()).toContain('mise à jour')
      expect(wrapper.findAll('[data-testid="period-months"] li')).toHaveLength(11)
    })

    it('says the period is up to date and keeps the copy when nothing changed', async () => {
      getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 'sha-1' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      getPeriodSha.mockResolvedValue('sha-1')

      await wrapper.get('[data-testid="period-refresh"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="period-refresh-result"]').text()).toContain('à jour')
      expect(getPeriodFile).toHaveBeenCalledTimes(1)
    })

    it('is disabled while edits are pending', async () => {
      pendingCountFor.mockReturnValue(3)
      getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 'sha-1' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()

      const button = wrapper.get('[data-testid="period-refresh"]')
      expect(button.attributes('disabled')).toBeDefined()
      await button.trigger('click')
      expect(getPeriodSha).not.toHaveBeenCalled()
    })

    it('reports a failure', async () => {
      getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 'sha-1' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      getPeriodSha.mockRejectedValue(new Error('502'))

      await wrapper.get('[data-testid="period-refresh"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de rafraîchir')
    })
  })
})

describe('period page with a misconfigured proxy', () => {
  it('shows the full-page misconfiguration error, without any variable name', async () => {
    const { MisconfiguredError } = await import('@/sync/periodsApi')
    getPeriodFile.mockRejectedValue(new MisconfiguredError())

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    const notice = wrapper.find('[data-testid="misconfigured"]')
    expect(notice.exists()).toBe(true)
    expect(notice.find('a').attributes('href')).toBe('https://app.netlify.com/')
    expect(wrapper.find('[data-testid="period-error"]').exists()).toBe(false)
    expect(notice.text()).not.toMatch(/DATA_/)
  })
})
