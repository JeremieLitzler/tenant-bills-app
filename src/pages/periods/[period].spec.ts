import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { formatValue, isInactiveTariffLine, LINES } from '@/components/periods/periodLines'
import { computePeriodFigures } from '@/domain/periodFigures'

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
    // September typed in full, October with only its main meter reading.
    function tableJson() {
      const json = periodJson()
      Object.assign(json.months[0].common, {
        startDate: '2026-08-12',
        endDate: '2026-09-11',
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
      expect(wrapper.get('[data-testid="line-common.startDate"] th').text()).toBe('Du')
      expect(wrapper.get('[data-testid="line-common.endDate"] th').text()).toBe('Au')
      expect(wrapper.get('[data-testid="line-common.tenantBillAdvance"] th').text()).toBe(
        'Avance sur charges reçue',
      )
    })

    it('styles typed and computed values differently', async () => {
      const { cells } = await openTable()

      const typed = cells('waterConsumption.mainMeter')[0]
      const computed = cells('waterConsumption.deltaMain')[0]
      expect(typed.attributes('data-provenance')).toBe('typed')
      expect(computed.attributes('data-provenance')).toBe('computed')
      expect(typed.classes()).not.toEqual(computed.classes())
    })

    it('shows the water indexes in m³ and the consumption figures', async () => {
      const { cells } = await openTable()

      expect(cells('waterConsumption.mainMeter')[0].text()).toBe('533,117')
      expect(cells('waterConsumption.deltaMain')[0].text()).toBe('3,117')
      expect(cells('common.startDate')[0].text()).toBe('12/08/2026')
      expect(cells('waterConsumption.bill')[0].text()).toMatch(/^\d+,\d{2}\s€$/)
      expect(cells('waterTreatment.bill')[0].text()).toMatch(/^\d+,\d{2}\s€$/)
    })

    it('shows every electricity line, with the other tariff mode as not applicable', async () => {
      const json = tableJson()
      Object.assign(json.months[0].electricity, {
        tariffMode: 'base',
        subscriptionUnit: 'month',
        mainBasePrevious: 100,
        mainBase: 150,
        // Leftover of the inactive mode: kept in the file, never shown.
        mainHc: 999,
        kwhPriceHc: 0.5,
      })
      Object.assign(json.months[1].electricity, { tariffMode: 'hchp', mainBase: 888 })
      const { wrapper, cells } = await openTable(json)

      expect(wrapper.get('[data-testid="section-electricity"]').text()).toBe('Électricité')
      expect(cells('electricity.mainBase')[0].text()).toBe('150')
      expect(cells('electricity.deltaMainBase')[0].text()).toBe('50')
      for (const id of ['mainHc', 'deltaMainHp', 'kwhPriceHc']) {
        expect(cells(`electricity.${id}`)[0].attributes('data-provenance')).toBe('not-applicable')
        expect(cells(`electricity.${id}`)[0].text()).toBe('')
      }
      expect(cells('electricity.mainBase')[1].attributes('data-provenance')).toBe('not-applicable')
      expect(cells('electricity.mainBase')[1].text()).not.toContain('888')
      expect(cells('electricity.bill')[0].exists()).toBe(true)
    })

    it('shows every computed electricity line as the figures give it', async () => {
      const json = tableJson()
      Object.assign(json.months[0].electricity, {
        tariffMode: 'hchp',
        subscriptionUnit: 'day',
        mainHcPrevious: 100,
        mainHc: 160,
        mainHpPrevious: 200,
        mainHp: 230,
        studioHcPrevious: 10,
        studioHc: 25,
        studioHpPrevious: 20,
        studioHp: 40,
        excisePerKwh: 0.02,
        kwhPriceBase: 0.2,
        kwhPriceHc: 0.15,
        kwhPriceHp: 0.25,
        subscriptionPerUnit: 0.5,
        ctaTax: 3,
        vat: 1.2,
      })
      const { cells } = await openTable(json)

      const figures = computePeriodFigures(json as never).months[0]
      const shown = LINES.filter(
        (line) =>
          line.section === 'electricity' &&
          line.computed &&
          !isInactiveTariffLine(line, json.months[0] as never),
      )
      const key = (id: string) => id.split('.')[1]
      expect(shown.length).toBeGreaterThan(5)
      for (const line of shown) {
        const value = (figures.electricity as unknown as Record<string, number | undefined>)[
          key(line.id)
        ]
        // Every input is typed, so no figure may be uncomputable.
        expect(value, line.id).toBeDefined()
        expect(cells(line.id)[0].text(), line.id).toBe(formatValue(line.kind, value!))
      }
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
      const { wrapper } = await openTable({ ...tableJson(), schemaVersion: 1 })

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
