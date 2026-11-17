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
    const months = wrapper.findAll('[data-testid="period-month"]')
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
    getPeriodFile.mockResolvedValue({ json: periodJson({ schemaVersion: 1 }), sha: 's' })

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="period-read-only"]').text()).toContain('lecture seule')
    expect(wrapper.findAll('[data-testid="period-month"]')).toHaveLength(12)
  })

  it('shows the read-only notice, without crashing, when the month entries are malformed', async () => {
    getPeriodFile.mockResolvedValue({
      json: periodJson({ months: [null, 'x', { month: 3 }, { month: '2026-09' }] }),
      sha: 's',
    })

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="period-read-only"]').text()).toContain('lecture seule')
    expect(wrapper.find('[data-testid="period-table"]').exists()).toBe(false)
  })

  describe('period table', () => {
    // September typed in full, October with only its readings: the rest is inherited or derived.
    function tableJson() {
      const json = periodJson()
      Object.assign(json.months[0].common, {
        readingDatePrevious: '2026-08-12',
        readingDate: '2026-09-11',
        landlordOccupants: 1,
        tenantOccupants: 1,
        tenantBillAdvance: 70,
      })
      Object.assign(json.months[0].waterConsumption, {
        mainMeterPrevious: 530000,
        mainMeter: 533117,
        studioUnsoftenedMeterPrevious: 10000,
        studioUnsoftenedMeter: 11000,
        studioSoftenedMeterPrevious: 20000,
        studioSoftenedMeter: 21000,
        pricePerM3: 1.5,
        resourceWithdrawalFee: 0.1,
        drinkingWaterFee: 0.2,
        networkPerformanceFee: 0.3,
        subscription: 10,
        vat: 1.055,
      })
      Object.assign(json.months[0].waterTreatment, {
        monthlySubscriptionDistributor: 4,
        monthlySubscriptionCommunity: 2,
        collectionConsumptionDistributor: 1,
        collectionConsumptionCommunity: 0.5,
        sanitationPerformance: 0.5,
        vat: 1.1,
      })
      Object.assign(json.months[1].waterConsumption, { mainMeter: 540000 })
      return json
    }

    async function openTable(json: unknown = tableJson()) {
      getPeriodFile.mockResolvedValue({ json, sha: 's' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      // The cells of a line, one per month.
      const cells = (line: string) => wrapper.findAll(`[data-testid="line-${line}"] td`)
      return { wrapper, cells }
    }

    it('shows a header row per section and the French labels of the lines', async () => {
      const { wrapper } = await openTable()

      expect(wrapper.get('[data-testid="section-common"]').text()).toBe('Commun')
      expect(wrapper.get('[data-testid="section-waterConsumption"]').text()).toBe(
        "Consommation d'eau",
      )
      expect(wrapper.get('[data-testid="section-waterTreatment"]').text()).toBe(
        "Traitement de l'eau",
      )
      expect(wrapper.get('[data-testid="line-common.windowStart"] th').text()).toBe('Du')
      expect(wrapper.get('[data-testid="line-common.readingDate"] th').text()).toBe('Au')
      expect(wrapper.get('[data-testid="line-common.tenantBillAdvance"] th').text()).toBe(
        'Avance sur charges reçue',
      )
    })

    it('styles typed, inherited, derived and computed values differently', async () => {
      const { cells } = await openTable()

      // October: the occupants are inherited, the previous index is derived, the reading is typed.
      // The computed figure is September's: figures read each month's stored values only.
      const occupants = cells('common.landlordOccupants')[1]
      const previous = cells('waterConsumption.mainMeterPrevious')[1]
      const typed = cells('waterConsumption.mainMeter')[1]
      const delta = cells('waterConsumption.deltaMain')[0]
      expect(occupants.attributes('data-provenance')).toBe('inherited')
      expect(previous.attributes('data-provenance')).toBe('derived')
      expect(typed.attributes('data-provenance')).toBe('typed')
      expect(delta.attributes('data-provenance')).toBe('computed')
      const classes = [occupants, previous, typed, delta].map((c) => c.classes().join(' '))
      expect(new Set(classes).size).toBe(4)
      expect(occupants.text()).toBe('1')
      expect(previous.text()).toBe('533,117')
    })

    it('shows the water indexes in m³ and the consumption figures', async () => {
      const { cells } = await openTable()

      expect(cells('waterConsumption.mainMeter')[0].text()).toBe('533,117')
      expect(cells('waterConsumption.deltaMain')[0].text()).toBe('3,117')
      expect(cells('common.windowStart')[0].text()).toBe('12/08/2026')
      expect(cells('waterConsumption.bill')[0].text()).toMatch(/^\d+,\d{2}\s€$/)
      expect(cells('waterTreatment.bill')[0].text()).toMatch(/^\d+,\d{2}\s€$/)
    })

    it('shows "—" in the amounts when an input is missing', async () => {
      const json = tableJson()
      delete (json.months[0].waterConsumption as Record<string, unknown>).pricePerM3
      const { cells } = await openTable(json)

      expect(cells('waterConsumption.bill')[0].text()).toBe('—')
      expect(cells('waterConsumption.tenantShare')[0].text()).toBe('—')
      // A missing input stays blank, it is not an amount.
      expect(cells('waterConsumption.pricePerM3')[0].text()).toBe('')
    })

    it('keeps the table and shows the read-only notice for a file breaking a rule', async () => {
      const { wrapper } = await openTable({ ...tableJson(), schemaVersion: 2 })

      expect(wrapper.get('[data-testid="period-read-only"]').text()).toContain('lecture seule')
      expect(wrapper.find('[data-testid="period-table"]').exists()).toBe(true)
    })

    it('shows the not-found state, without a table', async () => {
      const { NotFoundError } = await import('@/sync/periodsApi')
      getPeriodFile.mockRejectedValue(new NotFoundError())
      const { wrapper } = await openPeriodPage()
      await flushPromises()

      expect(wrapper.find('[data-testid="period-not-found"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="period-table"]').exists()).toBe(false)
    })
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
      expect(wrapper.findAll('[data-testid="period-month"]')).toHaveLength(11)
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
