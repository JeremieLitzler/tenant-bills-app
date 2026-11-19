import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LINES } from '@/components/periods/periodLines'

import { validPeriodJson } from '../../../../tests/helpers/periodFile'

const getPeriodFile = vi.fn()
const enqueuePatch = vi.fn()

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  getPeriodFile,
  listPeriodIds: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/sync/patchQueue', () => ({ enqueuePatch, listPatches: async () => [] }))
vi.mock('@/sync/drainQueue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/drainQueue')>()),
  drainQueue: async () => new Map(),
}))

async function openForm(edit: (json: ReturnType<typeof validPeriodJson>) => void = () => {}) {
  const json = validPeriodJson()
  Object.assign(json.months[0].waterConsumption, { mainMeterPrevious: 530000, mainMeter: 533117 })
  Object.assign(json.months[0].electricity, { tariffMode: 'base' })
  edit(json)
  getPeriodFile.mockResolvedValue({ json, sha: 's' })
  document.cookie = 'gh_login=JeremieLitzler; Path=/'
  const { default: router } = await import('@/router')
  const { default: App } = await import('@/App.vue')
  await router.push('/periods/2026-2027/2026-09')
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  const field = (id: string) => wrapper.get<HTMLInputElement>(`[data-testid="field-${id}"]`)
  const fill = async (id: string, text: string) => {
    await field(id).setValue(text)
    await field(id).trigger('blur')
    await flushPromises()
  }
  return { wrapper, router, field, fill }
}

beforeEach(() => {
  vi.resetModules()
  getPeriodFile.mockReset()
  enqueuePatch.mockReset()
})

describe('Saisie du mois', () => {
  it('shows exactly the input lines of the table for the month, in its order, with French labels', async () => {
    const { wrapper } = await openForm()
    const shown = wrapper.findAll('[data-testid^="field-"]').map((f) => f.attributes('data-testid'))
    const expected = LINES.filter(
      (l) => !l.computed && !(l.tariff && !['Base'].includes(l.tariff)),
    ).map((l) => `field-${l.id}`)
    expect(shown).toEqual(expected)
    expect(wrapper.text()).toContain('Compteur général, index actuel (m³)')
  })

  it('shows the computed figures read-only', async () => {
    const { wrapper } = await openForm()
    const figure = wrapper.get('[data-testid="figure-waterConsumption.deltaMain"]')
    expect(figure.find('input').exists()).toBe(false)
    expect(figure.text()).toContain('3,117')
  })

  it('queues a patch on blur, typing a water index in m³ as litres', async () => {
    const { fill } = await openForm()
    await fill('waterConsumption.mainMeter', '534,5')
    expect(enqueuePatch).toHaveBeenCalledExactlyOnceWith({
      period: '2026-2027',
      month: '2026-09',
      field: 'waterConsumption.mainMeter',
      value: 534500,
    })
  })

  it('queues nothing for an unchanged field and a removal for an emptied one', async () => {
    const { fill, field } = await openForm()
    await field('waterConsumption.mainMeter').trigger('blur')
    expect(enqueuePatch).not.toHaveBeenCalled()
    await fill('waterConsumption.mainMeter', '')
    expect(enqueuePatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ field: 'waterConsumption.mainMeter', value: null }),
    )
  })

  it('warns about a decreasing index and still queues it', async () => {
    const { wrapper, fill } = await openForm()
    expect(wrapper.find('[data-testid="warning-waterConsumption.mainMeter"]').exists()).toBe(false)
    await fill('waterConsumption.mainMeter', '500')
    expect(enqueuePatch).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="warning-waterConsumption.mainMeter"]').exists()).toBe(true)
  })

  it('marks a text that is no value and queues nothing', async () => {
    const { field, fill } = await openForm()
    await fill('common.landlordOccupants', 'abc')
    expect(enqueuePatch).not.toHaveBeenCalled()
    expect(field('common.landlordOccupants').attributes('aria-invalid')).toBe('true')
  })

  it('uses a numeric input mode for the numbers', async () => {
    const { field } = await openForm()
    expect(field('common.landlordOccupants').attributes('inputmode')).toBe('numeric')
    expect(field('waterConsumption.mainMeter').attributes('inputmode')).toBe('decimal')
  })

  it('switches to another month with the picker and links back to the table', async () => {
    const { wrapper, router } = await openForm()
    await wrapper.get('[data-testid="month-picker"]').setValue('2026-10')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/periods/2026-2027/2026-10')
    expect(wrapper.get('[data-testid="to-table"]').attributes('href')).toBe('/periods/2026-2027')
  })

  it('says so when the month is not in the period', async () => {
    const { wrapper, router } = await openForm()
    await router.push('/periods/2026-2027/2030-01')
    await flushPromises()
    expect(wrapper.find('[data-testid="month-not-found"]').exists()).toBe(true)
  })
})
