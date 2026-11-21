import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { validPeriodJson } from '../../../tests/helpers/periodFile'
import MonthForm from './MonthForm.vue'
import { isInactiveTariffLine, LINES } from './periodLines'

const getPeriodFile = vi.hoisted(() => vi.fn())
const enqueuePatch = vi.hoisted(() => vi.fn())

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  getPeriodFile,
}))
vi.mock('@/sync/patchQueue', () => ({ enqueuePatch, listPatches: async () => [] }))
vi.mock('@/sync/drainQueue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/drainQueue')>()),
  drainQueue: async () => new Map(),
}))

// Mounts the form alone, with the real period state over a fixture and a router for the picker.
async function openForm(
  edit: (json: ReturnType<typeof validPeriodJson>) => void = () => {},
  month = '2026-09',
  focusField?: string,
  open = 'waterConsumption,waterTreatment,waterSoftener,electricity,internet,heatPumpMaintenance',
  periodId = '2026-2027',
) {
  const json = validPeriodJson()
  Object.assign(json.months[0].waterConsumption, { mainMeterPrevious: 530000, mainMeter: 533117 })
  Object.assign(json.months[0].electricity, { tariffMode: 'base' })
  edit(json)
  getPeriodFile.mockResolvedValue({ json, sha: 's' })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/periods/:period/months/:month', component: { template: '<i />' } }],
  })
  await router.push({ path: `/periods/${periodId}/months/${month}`, query: open ? { open } : {} })
  const wrapper = mount(MonthForm, {
    props: { periodId, month, field: focusField },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  await flushPromises()
  const field = (id: string) => wrapper.get<HTMLInputElement>(`[data-testid="field-${id}"]`)
  const fill = async (id: string, text: string) => {
    await field(id).setValue(text)
    await field(id).trigger('blur')
    await flushPromises()
  }
  return { wrapper, router, field, fill }
}

enableAutoUnmount(afterEach)
// A test may leave the modal apply dialog open: it would lock the next one.
afterEach(() => document.body.removeAttribute('style'))

beforeEach(() => {
  vi.resetModules()
  getPeriodFile.mockReset()
  enqueuePatch.mockReset()
})

describe('Saisie du mois', () => {
  it('shows exactly the input lines of the table for the month, in its order, with French labels', async () => {
    const { wrapper } = await openForm()
    const shown = wrapper.findAll('[data-testid^="field-"]').map((f) => f.attributes('data-testid'))
    const entry = { electricity: { tariffMode: 'base' } } as never
    const expected = LINES.filter((l) => !l.computed && !isInactiveTariffLine(l, entry)).map(
      (l) => `field-${l.id}`,
    )
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
    expect(field('common.landlordOccupants').classes()).toContain('ring-destructive')
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
    expect(router.currentRoute.value.path).toBe('/periods/2026-2027/months/2026-10')
    // The open sections travel back with the link.
    expect(wrapper.get('[data-testid="to-table"]').attributes('href')).toMatch(
      /^\/periods\/2026-2027\?open=waterConsumption,/,
    )
  })

  it('says so when the month is not in the period', async () => {
    const { wrapper } = await openForm(() => {}, '2030-01')
    expect(wrapper.find('[data-testid="month-not-found"]').exists()).toBe(true)
  })

  it('follows a change of tariff mode, both ways', async () => {
    const { wrapper, field, fill } = await openForm()
    const has = (id: string) => wrapper.find(`[data-testid="field-${id}"]`).exists()
    expect([has('electricity.kwhPriceBase'), has('electricity.kwhPriceHc')]).toEqual([true, false])
    await fill('electricity.tariffMode', 'HC/HP')
    expect([has('electricity.kwhPriceBase'), has('electricity.kwhPriceHc')]).toEqual([false, true])
    await fill('electricity.tariffMode', 'Base')
    expect([has('electricity.kwhPriceBase'), has('electricity.kwhPriceHc')]).toEqual([true, false])
    expect(field('electricity.tariffMode').element.value).toBe('Base')
  })

  describe('apply dialog (Case 8)', () => {
    const dialog = () => document.body.querySelector('[role=alertdialog]')
    const button = (label: string) =>
      [...document.body.querySelectorAll('[role=alertdialog] button')].find(
        (b) => b.textContent === label,
      ) as HTMLElement

    it('offers to apply an edited value to the later months, "Oui" queues them all', async () => {
      const { fill } = await openForm()
      await fill('common.landlordOccupants', '4')
      expect(dialog()?.textContent).toContain('tous les mois suivants')
      enqueuePatch.mockClear()
      button('Oui').click()
      await flushPromises()
      expect(enqueuePatch).toHaveBeenCalledTimes(11)
      expect(dialog()).toBeNull()
    })

    // The period state outlives a test (a static import), so this value differs from the first test's.
    it('"Non" changes only the edited month', async () => {
      const { fill } = await openForm()
      await fill('common.landlordOccupants', '5')
      enqueuePatch.mockClear()
      button('Non').click()
      await flushPromises()
      expect(enqueuePatch).not.toHaveBeenCalled()
      expect(dialog()).toBeNull()
    })
  })
})

describe('MonthForm field focus', () => {
  it('focuses the requested field on arrival', async () => {
    const { field } = await openForm(undefined, '2026-09', 'common.landlordOccupants')
    expect(document.activeElement).toBe(field('common.landlordOccupants').element)
  })
})

describe('MonthForm collapsible sections', () => {
  const summary = (w: Awaited<ReturnType<typeof openForm>>['wrapper'], id: string) =>
    w.get(`[data-testid="panel-${id}"] summary`)
  const isOpen = (w: Awaited<ReturnType<typeof openForm>>['wrapper'], id: string) =>
    (w.get(`[data-testid="panel-${id}"]`).element as HTMLDetailsElement).open

  it('has every panel closed with nothing in the URL, the common fields always shown', async () => {
    const { wrapper } = await openForm(undefined, '2026-09', undefined, '')
    expect(isOpen(wrapper, 'internet')).toBe(false)
    expect(wrapper.get('[data-testid="panel-common"]').element.tagName).toBe('FIELDSET')
    expect(wrapper.find('[data-testid="panel-common"] summary').exists()).toBe(false)
  })

  it('opens and closes a panel from its summary and writes ?open=', async () => {
    const { wrapper, router } = await openForm(undefined, '2026-09', undefined, '')
    await summary(wrapper, 'internet').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.open).toBe('internet')
    expect(isOpen(wrapper, 'internet')).toBe(true)
    await summary(wrapper, 'internet').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.open).toBeUndefined()
    expect(isOpen(wrapper, 'internet')).toBe(false)
  })

  it('ignores an unknown section name', async () => {
    const { wrapper } = await openForm(undefined, '2026-09', undefined, 'nope,internet')
    expect(isOpen(wrapper, 'internet')).toBe(true)
    expect(isOpen(wrapper, 'electricity')).toBe(false)
  })

  describe('icons', () => {
    const status = (w: Awaited<ReturnType<typeof openForm>>['wrapper'], id: string) =>
      w.find(`[data-testid="status-${id}"]`)

    // The period state outlives a test: the fixture edits go through the form, on a fresh period.
    it('shows a green check on a complete section, nothing on an incomplete one', async () => {
      const { wrapper, fill } = await openForm(undefined, '2026-09', undefined, undefined, 'fresh')
      expect(status(wrapper, 'internet').exists()).toBe(false)
      await fill('internet.billedAmount', '30')
      expect(status(wrapper, 'internet').attributes('aria-label')).toBe('Section complète')
      expect(status(wrapper, 'heatPumpMaintenance').exists()).toBe(false)
    })

    it('shows the warning icon, replacing the check, on a section with a decreasing index', async () => {
      const { wrapper, fill } = await openForm()
      await fill('waterConsumption.mainMeter', '500')
      expect(status(wrapper, 'waterConsumption').attributes('aria-label')).toBe(
        'Section avec un avertissement',
      )
    })

    it('shows no icon on a closed period', async () => {
      const { wrapper } = await openForm(
        (json) => {
          Object.assign(json.months[0].internet, { billedAmount: 30 })
          ;(json as Record<string, unknown>).closedOn = '2027-09-01'
        },
        '2026-09',
        undefined,
        undefined,
        'closed',
      )
      expect(wrapper.find('[data-testid^="status-"]').exists()).toBe(false)
    })
  })
})
