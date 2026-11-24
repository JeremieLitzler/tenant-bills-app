import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { formatValue, isInactiveTariffLine, LINES } from '@/components/periods/periodLines'
import { computePeriodFigures } from '@/domain/periodFigures'

import { completeMonth, validPeriodJson } from '@tests/helpers/periodFile'

const getPeriodFile = vi.fn<(id: string) => Promise<{ json: unknown; sha: string } | undefined>>()
const getPeriodSha = vi.fn<(id: string) => Promise<string>>()
const pendingCountFor = vi.fn<(id: string) => number>(() => 0)
const enqueuePatch = vi.fn<(patch: unknown) => Promise<void>>(async () => {})
const listPeriodIds = vi.fn<() => Promise<string[]>>()

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  getPeriodFile,
  getPeriodSha,
  listPeriodIds,
}))

vi.mock('@/composables/pendingPatches', () => ({
  pendingCountFor,
  pendingCount: { value: 0 },
  setPendingCounts: () => {},
}))

// The local stores are IndexedDB, which `flushPromises` does not wait for (src/sync/ has its own specs).
vi.mock('@/sync/periodCopies', () => ({
  savePeriodCopy: async () => {},
  readPeriodCopy: async () => undefined,
}))
vi.mock('@/sync/patchQueue', () => ({
  enqueuePatch,
  listPatches: async () => [],
}))

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
  enqueuePatch.mockClear()
  getPeriodSha.mockReset()
  pendingCountFor.mockReset()
  pendingCountFor.mockReturnValue(0)
  listPeriodIds.mockReset()
  listPeriodIds.mockResolvedValue([])
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('period page', () => {
  it('has a back button to the home page', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 's' })
    const { wrapper, router } = await openPeriodPage()
    await flushPromises()

    await wrapper.get('[data-testid="period-back"]').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/'))
  })

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

  it('exposes setCell on window while the page is open, for the console demo of #48', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 's' })
    const { wrapper } = await openPeriodPage()
    await flushPromises()

    expect(typeof window.setCell).toBe('function')
    wrapper.unmount()
    expect(window.setCell).toBeUndefined()
  })

  it('checks the remote SHA, and does not fetch the file again when it is unchanged, on coming back', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 's' })
    getPeriodSha.mockResolvedValue('s')
    const { router, wrapper } = await openPeriodPage()
    await flushPromises()

    await router.push('/')
    await flushPromises()
    await router.push('/periods/2026-2027')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('2026-2027')
    expect(getPeriodSha).toHaveBeenCalledTimes(1)
    expect(getPeriodFile).toHaveBeenCalledTimes(1)
  })

  it('shows the closed notice with the closing date in a closed period only', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson({ closedOn: '2027-09-01' }), sha: 's' })
    const closed = await openPeriodPage()
    await flushPromises()
    expect(closed.wrapper.get('[data-testid="period-closed"]').text()).toContain('01/09/2027')

    getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 's' })
    const open = await openPeriodPage()
    await flushPromises()
    expect(open.wrapper.find('[data-testid="period-closed"]').exists()).toBe(false)
  })

  it('edits the monthly tenant bill advance in the settings panel, saved as a top-level patch (#83)', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 's' })
    const { wrapper } = await openPeriodPage()
    await flushPromises()
    const input = wrapper.get<HTMLInputElement>('[data-testid="setting-monthlyTenantBillAdvance"]')
    expect(input.element.value).toBe('70')

    await input.setValue('0')
    await input.trigger('blur')
    expect(wrapper.find('[data-testid="setting-invalid"]').exists()).toBe(true)

    await input.setValue('75,5')
    await input.trigger('blur')
    await flushPromises()
    expect(wrapper.find('[data-testid="setting-invalid"]').exists()).toBe(false)
    expect(input.element.value).toBe('75.5')
    expect(enqueuePatch).toHaveBeenCalledTimes(1)
    expect(enqueuePatch).toHaveBeenCalledWith({
      period: '2026-2027',
      month: null,
      field: 'monthlyTenantBillAdvance',
      value: 75.5,
    })
  })

  it('locks the settings panel in a closed period (#83)', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson({ closedOn: '2027-09-01' }), sha: 's' })
    const { wrapper } = await openPeriodPage()
    await flushPromises()
    expect(
      wrapper.get<HTMLInputElement>('[data-testid="setting-monthlyTenantBillAdvance"]').element
        .disabled,
    ).toBe(true)
  })

  it('shows the months and a read-only notice for a file breaking a validation rule', async () => {
    getPeriodFile.mockResolvedValue({ json: periodJson({ schemaVersion: 1 }), sha: 's' })

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    const notice = wrapper.get('[data-testid="period-read-only"]')
    expect(notice.text()).toContain('lecture seule')
    expect(notice.classes()).toContain('border-theme-warning')
    expect(notice.find('button').exists()).toBe(false)
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

  describe('initializing the next month', () => {
    function json(months: number, lastIsComplete = true) {
      const file = periodJson()
      const list = file.months.slice(0, months).map((m) => completeMonth(m.month))
      list[months - 1].common.endDate = '2027-07-15'
      if (!lastIsComplete) Object.assign(list[months - 1], { internet: {} })
      return Object.assign(file, { months: list })
    }

    it('offers the button once the last month is complete, and adds the month on a click', async () => {
      getPeriodFile.mockResolvedValue({ json: json(3), sha: 's' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      expect(wrapper.findAll('[data-testid="period-month"]')).toHaveLength(3)

      await wrapper.get('[data-testid="initialize-month"]').trigger('click')
      await flushPromises()

      expect(wrapper.findAll('[data-testid="period-month"]')).toHaveLength(4)
      expect(wrapper.find('[data-testid="initialize-month"]').exists()).toBe(false)
    })

    it('asks to complete the last month, in a warning notice, when it is not', async () => {
      getPeriodFile.mockResolvedValue({ json: json(3, false), sha: 's' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()

      expect(wrapper.find('[data-testid="initialize-month"]').exists()).toBe(false)
      const notice = wrapper.get('[data-testid="initialize-month-incomplete"]')
      expect(notice.text()).toContain('Complétez le dernier mois')
      expect(notice.classes()).toContain('border-theme-warning')
    })

    it('offers nothing after the twelfth month', async () => {
      getPeriodFile.mockResolvedValue({ json: json(12), sha: 's' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()

      expect(wrapper.find('[data-testid="initialize-month"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="initialize-month-incomplete"]').exists()).toBe(false)
    })
  })

  describe('closing the period (#84)', () => {
    const MONTH_IDS = [
      '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02',
      '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08',
    ] // prettier-ignore
    const json = (advance = 70) => {
      const file = periodJson()
      file.months = MONTH_IDS.map((id, i) => {
        const month = completeMonth(id)
        month.common.tenantBillAdvance = i === 1 ? advance : 70
        return month
      })
      return file
    }
    const body = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`)

    it('shows the state of the five checks from the twelfth month on, in the second column', async () => {
      const partial = json()
      Object.assign(partial.months[5].common, { estimated: true })
      delete (partial.months[3].common as Record<string, unknown>).endDate
      getPeriodFile.mockResolvedValue({ json: partial, sha: 's' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      const state = (key: string) =>
        wrapper
          .get(`[data-testid="period-col-2"] [data-testid="close-check-${key}"]`)
          .attributes('data-ok')
      expect(
        ['notClosed', 'twelveMonths', 'allComplete', 'noneEstimated', 'notReadOnly'].map(state),
      ).toEqual(['true', 'true', 'false', 'false', 'true'])
      expect(
        wrapper.get('[data-testid="period-col-1"]').find('[data-testid="period-close"]').exists(),
      ).toBe(false)
      expect(wrapper.get('[data-testid="close-check-incomplete-months"]').text()).toBe(
        'décembre 2026 : Commun',
      )
    })

    it('shows no checklist before the twelfth month exists', async () => {
      const short = json()
      short.months = short.months.slice(0, 3)
      getPeriodFile.mockResolvedValue({ json: short, sha: 's' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      expect(wrapper.find('[data-testid="close-checks"]').exists()).toBe(false)
    })

    it('is disabled while the period cannot be closed', async () => {
      getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 's' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      expect(wrapper.get('[data-testid="period-close"]').attributes('disabled')).toBeDefined()
    })

    it('lists the 0-advance months, needs the tick, then writes closedOn as a top-level patch', async () => {
      getPeriodFile.mockResolvedValue({ json: json(0), sha: 's' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      await wrapper.get('[data-testid="period-close"]').trigger('click')
      await flushPromises()

      expect(body('period-close-no-advance')?.textContent).toContain('octobre 2026')
      const confirm = body('period-close-confirm') as HTMLButtonElement
      expect(confirm.disabled).toBe(true)
      body('period-close-bills')!.click()
      await flushPromises()
      expect(confirm.disabled).toBe(false)
      confirm.click()
      await flushPromises()

      expect(enqueuePatch).toHaveBeenCalledWith(
        expect.objectContaining({
          period: '2026-2027',
          month: null,
          field: 'closedOn',
          value: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      expect(wrapper.find('[data-testid="period-closed"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="period-close"]').exists()).toBe(false)
    })
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
      const { wrapper } = await openPeriodPage(
        '/periods/2026-2027?open=waterConsumption,waterTreatment,waterSoftener,electricity,internet,heatPumpMaintenance',
      )
      await flushPromises()
      // The cells of a line, one per month.
      const cells = (line: string) =>
        wrapper.findAll(`[data-testid="line-${line}"] td:not([data-testid="total"])`)
      return { wrapper, cells }
    }

    it('shows a header row per section and the French labels of the lines', async () => {
      const { wrapper } = await openTable()

      // The common lines are always shown: they have no header row.
      expect(wrapper.find('[data-testid="section-common"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="section-waterConsumption"] button').text()).toBe(
        "Consommation d'eau",
      )
      expect(wrapper.get('[data-testid="section-waterTreatment"] button').text()).toBe(
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

    it('highlights a decreasing index and an end date before the start, still as stored', async () => {
      const json = tableJson()
      Object.assign(json.months[0].waterConsumption, {
        mainMeterPrevious: 600000,
        mainMeter: 533117,
      })
      Object.assign(json.months[0].common, { startDate: '2026-09-12', endDate: '2026-09-11' })
      Object.assign(json.months[1].waterConsumption, {
        mainMeterPrevious: 500000,
        mainMeter: 500000,
      })
      const { cells } = await openTable(json)

      const decreasing = cells('waterConsumption.mainMeter')[0]
      expect(decreasing.attributes('data-warning')).toBe('indexBelowPrevious')
      expect(decreasing.text()).toBe('533,117')
      // The explanation shows under the cell once it is selected, and only there.
      expect(decreasing.find('[role="status"]').exists()).toBe(false)
      await decreasing.trigger('click')
      expect(decreasing.get('[role="status"]').text()).toBe(
        "L'index est inférieur à l'index précédent",
      )
      expect(cells('common.endDate')[0].text()).toBe('11/09/2026')
      await cells('common.endDate')[0].trigger('click')
      expect(decreasing.find('[role="status"]').exists()).toBe(false)
      expect(cells('common.endDate')[0].attributes('data-warning')).toBe('endBeforeStart')
      expect(cells('waterConsumption.mainMeter')[1].attributes('data-warning')).toBeUndefined()
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

      expect(wrapper.get('[data-testid="section-electricity"] button').text()).toBe('Électricité')
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

    it('shows the softener, internet and heat pump lines, a purchase only in its own month', async () => {
      const json = tableJson()
      Object.assign(json.months[0].waterSoftener, {
        description: 'Sel',
        quantity: 2,
        unitPrice: 10,
      })
      Object.assign(json.months[0].internet, { billedAmount: 30 })
      Object.assign(json.months[0].heatPumpMaintenance, { billedAmount: 12 })
      const { wrapper, cells } = await openTable(json)

      for (const id of ['waterSoftener', 'internet', 'heatPumpMaintenance']) {
        expect(wrapper.find(`[data-testid="section-${id}"]`).exists()).toBe(true)
      }
      expect(cells('waterSoftener.description')[0].text()).toBe('Sel')
      expect(cells('waterSoftener.quantity')[1].text()).toBe('')
      expect(cells('waterSoftener.tenantShare')[0].text()).not.toBe('—')
      expect(cells('internet.billedAmount')[0].text()).toContain('30')
      expect(cells('heatPumpMaintenance.billedAmount')[0].text()).toContain('12')
      expect(cells('heatPumpMaintenance.billedAmount')[1].text()).toBe('')
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

  describe('load error', () => {
    it('shows an error toast and a "Réessayer" button that loads the period again', async () => {
      getPeriodFile.mockRejectedValueOnce(new Error('502'))
      const { wrapper } = await openPeriodPage()
      await flushPromises()

      expect(wrapper.get('[data-testid="toast"]').text()).toContain('Impossible de charger')
      getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 's' })
      await wrapper.get('[data-testid="period-retry"]').trigger('click')
      await flushPromises()

      expect(getPeriodFile).toHaveBeenCalledTimes(2)
      expect(wrapper.get('h1').text()).toBe('2026-2027')
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

      const toast = wrapper.get('[data-testid="toast"]')
      expect(toast.text()).toContain('mise à jour')
      expect(toast.attributes('role')).toBe('status')
      expect(wrapper.find('[data-testid="period-refresh-result"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-testid="period-month"]')).toHaveLength(11)
    })

    it('says the period is up to date and keeps the copy when nothing changed', async () => {
      getPeriodFile.mockResolvedValue({ json: periodJson(), sha: 'sha-1' })
      const { wrapper } = await openPeriodPage()
      await flushPromises()
      getPeriodSha.mockResolvedValue('sha-1')

      await wrapper.get('[data-testid="period-refresh"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="toast"]').text()).toContain('à jour')
      expect(wrapper.find('[data-testid="period-refresh-result"]').exists()).toBe(false)
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

      expect(wrapper.get('[data-testid="toast"][role="alert"]').text()).toContain(
        'Impossible de rafraîchir',
      )
    })
  })
})

describe('period page with a misconfigured proxy', () => {
  it('shows the misconfiguration toast, without any variable name', async () => {
    const { MisconfiguredError } = await import('@/sync/periodsApi')
    getPeriodFile.mockRejectedValue(new MisconfiguredError())

    const { wrapper } = await openPeriodPage()
    await flushPromises()

    const notice = wrapper.get('[data-testid="toast"]')
    expect(notice.get('a').attributes('href')).toBe('https://app.netlify.com/')
    expect(wrapper.find('[data-testid="period-retry"]').exists()).toBe(true)
    expect(notice.text()).not.toMatch(/DATA_/)
  })
})
