import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { computePeriodFigures } from '@/domain/periodFigures'
import { completeMonth, validPeriodJson } from '@tests/helpers/periodFile'
import SettlementView from './SettlementView.vue'
import { formatValue } from './periodLines'

const getPeriodFile = vi.hoisted(() => vi.fn())
vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  getPeriodFile,
}))
vi.mock('@/sync/patchQueue', () => ({ enqueuePatch: vi.fn(), listPatches: async () => [] }))
vi.mock('@/sync/periodCopies', () => ({
  savePeriodCopy: async () => {},
  readPeriodCopy: async () => undefined,
}))
vi.mock('@/sync/drainQueue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/drainQueue')>()),
  drainQueue: async () => new Map(),
}))

// The period state is shared by the module, so every test opens its own period.
let nextYear = 2030
const nextPeriodId = () => `${nextYear}-${++nextYear}`

// The back button is a router link.
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:p(.*)*', component: { template: '<i />' } }],
})

const euros = (value: number) => formatValue('money', value)

// A period of twelve complete months: the tenant owes 20 € of internet a month.
async function openSettlement(
  edit: (json: ReturnType<typeof validPeriodJson> & Record<string, unknown>) => void = () => {},
  options: { complete?: boolean; advance?: number; heatPump?: number } = {},
) {
  const { complete = true, advance = 0, heatPump = 5 } = options
  const periodId = nextPeriodId()
  const json = validPeriodJson(periodId) as ReturnType<typeof validPeriodJson> &
    Record<string, unknown>
  if (complete) {
    json.months = json.months.map(({ month }) => {
      const entry = completeMonth(month)
      entry.common.tenantBillAdvance = advance
      entry.heatPumpMaintenance.billedAmount = heatPump
      return entry
    }) as never
  }
  edit(json)
  getPeriodFile.mockResolvedValue({ json, sha: 's' })
  const wrapper = mount(SettlementView, { props: { periodId }, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, totals: computePeriodFigures(json as never).totals }
}

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetModules()
  getPeriodFile.mockReset()
})

describe('Situation comptable', () => {
  it('is labelled provisoire before the twelfth month exists, with no banner', async () => {
    const { wrapper } = await openSettlement(undefined, { complete: false })
    expect(wrapper.get('[data-testid="settlement-state"]').text()).toContain('provisoire')
    expect(wrapper.find('[data-testid="october-banner"]').exists()).toBe(false)
  })

  it('says Régularisation estimée while the twelfth month is estimated', async () => {
    const { wrapper } = await openSettlement((json) => {
      ;(json.months[11].common as { estimated?: boolean }).estimated = true
    })
    expect(wrapper.get('[data-testid="settlement-state"]').text()).toContain(
      'Régularisation estimée',
    )
    expect(wrapper.get('[data-testid="next-advance"]').text()).toContain('€')
    expect(wrapper.find('[data-testid="october-banner"]').exists()).toBe(false)
  })

  it('shows the October banner once August is read and the period is open', async () => {
    const { wrapper } = await openSettlement()
    expect(wrapper.get('[data-testid="october-banner"]').text()).toContain('octobre')
  })

  it('is final with its closing date and no banner once closed', async () => {
    const { wrapper } = await openSettlement((json) => (json.closedOn = '2027-09-05'))
    expect(wrapper.get('[data-testid="settlement-state"]').text()).toContain(
      'définitive, clôturée le 05/09/2027',
    )
    expect(wrapper.find('[data-testid="october-banner"]').exists()).toBe(false)
  })

  it('says the landlord owes the tenant when the advances exceed the shares', async () => {
    const { wrapper, totals } = await openSettlement(undefined, { advance: 1000 })
    expect(totals.balance).toBeGreaterThan(0)
    expect(wrapper.get('[data-testid="settlement-direction"]').text()).toBe(
      `Le bailleur doit au locataire ${euros(totals.balance!)}`,
    )
  })

  it('says the tenant owes the landlord when the shares exceed the advances', async () => {
    const { wrapper, totals } = await openSettlement(undefined, { advance: 0 })
    expect(totals.balance).toBeLessThan(0)
    expect(wrapper.get('[data-testid="settlement-direction"]').text()).toBe(
      `Le locataire doit au bailleur ${euros(-totals.balance!)}`,
    )
  })

  it('shows the next advance rounded up to the euro with the exact average', async () => {
    const { wrapper, totals } = await openSettlement()
    const text = wrapper.get('[data-testid="next-advance"]').text()
    expect(text).toContain(euros(totals.nextAdvance!))
    expect(text).toContain(`moyenne exacte : ${euros(totals.averageAdvance!)}`)
    expect(totals.nextAdvance).toBe(Math.ceil(Math.round(totals.totalTenantShares! * 100) / 1200))
  })

  it('shows the heat pump maintenance among the sections and in the total', async () => {
    const { wrapper, totals } = await openSettlement()
    const section = wrapper.get('[data-testid="settlement-heatPumpMaintenance"]')
    expect(section.get('[data-testid="section-total"]').text()).toBe(euros(60))
    expect(section.findAll('td')).toHaveLength(13)
    expect(totals.heatPumpMaintenanceTenant).toBe(60)
    expect(wrapper.get('[data-testid="total-tenant-shares"]').text()).toBe(
      euros(totals.totalTenantShares!),
    )
  })

  it('shows "—" for an amount that cannot be computed yet', async () => {
    const { wrapper } = await openSettlement(undefined, { complete: false })
    expect(wrapper.get('[data-testid="balance"]').text()).toBe('—')
    expect(wrapper.get('[data-testid="settlement-direction"]').text()).toBe('—')
    expect(wrapper.get('[data-testid="next-advance"]').text()).toContain('—')
  })

  it('has a back button to the period', async () => {
    const { wrapper } = await openSettlement()
    expect(wrapper.get('[data-testid="settlement-back"]').attributes('href')).toMatch(
      /^\/periods\/20\d\d-20\d\d$/,
    )
  })

  it('shows the loader, then the not-found state', async () => {
    getPeriodFile.mockReturnValue(new Promise(() => {}))
    const loading = mount(SettlementView, {
      props: { periodId: nextPeriodId() },
      global: { plugins: [router] },
    })
    expect(loading.find('[data-testid="period-loading"]').exists()).toBe(true)
    const { NotFoundError } = await import('@/sync/periodsApi')
    getPeriodFile.mockRejectedValue(new NotFoundError())
    const missing = mount(SettlementView, {
      props: { periodId: nextPeriodId() },
      global: { plugins: [router] },
    })
    await flushPromises()
    expect(missing.find('[data-testid="period-not-found"]').exists()).toBe(true)
  })

  it('shows the read-only notice for a file that broke a rule', async () => {
    const { wrapper } = await openSettlement((json) => (json.schemaVersion = 1))
    expect(wrapper.find('[data-testid="period-read-only"]').exists()).toBe(true)
  })
})
