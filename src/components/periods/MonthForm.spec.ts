import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { validPeriodJson } from '@tests/helpers/periodFile'
import { useToasts } from '@/composables/useToasts'
import { fr } from '@/i18n/fr'
import MonthForm from './MonthForm.vue'
import { isInactiveTariffLine, LINES } from './periodLines'

const getPeriodFile = vi.hoisted(() => vi.fn())
const enqueuePatch = vi.hoisted(() => vi.fn())
// The copy of the estimate, by month; empty means this device holds none.
const estimates = vi.hoisted(() => new Map<string, Record<string, number>>())
vi.mock('@/sync/estimateCopies', () => ({
  saveEstimate: async () => {},
  readEstimate: async (_period: string, month: string) => estimates.get(month),
  removeEstimate: async (_period: string, month: string) => void estimates.delete(month),
}))

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  getPeriodFile,
}))
vi.mock('@/sync/patchQueue', () => ({ enqueuePatch, listPatches: async () => [] }))
vi.mock('@/sync/periodCopies', () => ({
  savePeriodCopy: async () => {},
  readPeriodCopy: async () => undefined,
}))
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
  estimates.clear()
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

  it('warns about an end date before the start date and still queues it', async () => {
    const { wrapper, fill } = await openForm()
    expect(wrapper.find('[data-testid="warning-common.endDate"]').exists()).toBe(false)
    await fill('common.startDate', '2026-09-12')
    await fill('common.endDate', '2026-09-01')
    expect(enqueuePatch).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-testid="warning-common.endDate"]').text()).toContain('précède')
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

  it('links to the settlement of the same period', async () => {
    const { wrapper } = await openForm()
    expect(wrapper.get('[data-testid="settlement-link"]').attributes('href')).toMatch(
      /^\/periods\/20\d\d-20\d\d\/settlement$/,
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

  it('switches the subscription unit with one queued patch', async () => {
    const { field } = await openForm()
    await field('electricity.subscriptionUnit').setValue('Par jour')
    await flushPromises()
    expect(enqueuePatch).toHaveBeenCalledWith(
      expect.objectContaining({
        month: '2026-09',
        field: 'electricity.subscriptionUnit',
        value: 'day',
      }),
    )
  })

  describe('advance suggestion', () => {
    const suggest = (w: Awaited<ReturnType<typeof openForm>>['wrapper']) =>
      w.find('[data-testid="suggest-common.tenantBillAdvance"]')

    it('queues the period advance in one click on a month with a 0 advance', async () => {
      const { wrapper } = await openForm()
      await suggest(wrapper).trigger('click')
      await flushPromises()
      expect(enqueuePatch).toHaveBeenCalledWith(
        expect.objectContaining({ field: 'common.tenantBillAdvance', value: 70 }),
      )
    })

    it('is hidden once an advance is typed and in a closed period', async () => {
      const typed = await openForm((json) => {
        json.months[0].common.tenantBillAdvance = 50
      })
      expect(suggest(typed.wrapper).exists()).toBe(false)
      // Another period id: the period state is cached by id.
      const closed = await openForm(
        (json) => {
          ;(json as Record<string, unknown>).closedOn = '2027-09-01'
        },
        '2026-09',
        undefined,
        undefined,
        '2025-2026',
      )
      expect(suggest(closed.wrapper).exists()).toBe(false)
      expect(closed.field('electricity.tariffMode').element.disabled).toBe(true)
    })
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

  it('opens a panel with ArrowRight and closes it with ArrowLeft on its summary', async () => {
    const { wrapper } = await openForm(undefined, '2026-09', undefined, '')
    await summary(wrapper, 'internet').trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(isOpen(wrapper, 'internet')).toBe(true)
    await summary(wrapper, 'internet').trigger('keydown', { key: 'ArrowLeft' })
    await flushPromises()
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

  describe('the estimated twelfth month', () => {
    const TWELFTH = '2027-08'
    const estimatedMonth = (json: ReturnType<typeof validPeriodJson>) => {
      // Eleventh delta 10 and 5; the twelfth estimate is 110 and 25, the typed main index equals it.
      Object.assign(json.months[10].waterConsumption, {
        mainMeterPrevious: 90,
        mainMeter: 100,
        studioUnsoftenedMeterPrevious: 20,
        studioUnsoftenedMeter: 25,
      })
      Object.assign(json.months[11].waterConsumption, {
        mainMeterPrevious: 100,
        mainMeter: 110,
        studioUnsoftenedMeterPrevious: 25,
        studioUnsoftenedMeter: 26,
      })
      Object.assign(json.months[11].electricity, { tariffMode: 'base' })
      ;(json.months[11].common as Record<string, unknown>).estimated = true
    }
    // A period id of its own per test: the period state outlives a test.
    let nth = 0
    const open = async (copy?: Record<string, number>) => {
      if (copy) estimates.set(TWELFTH, copy)
      return openForm(
        estimatedMonth,
        TWELFTH,
        undefined,
        undefined,
        `${2040 + nth}-${2041 + nth++}`,
      )
    }
    // The main index still equals its estimate, the studio one was overtyped.
    const COPY = { 'waterConsumption.mainMeter': 110, 'waterConsumption.studioUnsoftenedMeter': 25 }
    const dialog = () => document.body.querySelector('[data-testid="estimated-dialog"]')!

    it('shows the notice for the estimated month only', async () => {
      const { wrapper } = await open()
      expect(wrapper.find('[data-testid="estimated-notice"]').exists()).toBe(true)
      await wrapper.setProps({ month: '2026-09' })
      expect(wrapper.find('[data-testid="estimated-notice"]').exists()).toBe(false)
    })

    it('lists the indexes still equal to their estimate and queues nothing on cancel', async () => {
      const { wrapper } = await open(COPY)
      await wrapper.get('[data-testid="confirm-reading"]').trigger('click')
      await flushPromises()
      expect(dialog().textContent).toContain('Compteur général, index actuel')
      expect(dialog().textContent).not.toContain('Studio non adoucie, index actuel')
      const cancel = [...dialog().querySelectorAll('button')].find(
        (b) => b.textContent === 'Annuler',
      )!
      cancel.click()
      await flushPromises()
      expect(enqueuePatch).not.toHaveBeenCalled()
      expect(estimates.has(TWELFTH)).toBe(true)
    })

    it('still opens, saying the list is unavailable, without a copy of the estimate', async () => {
      const { wrapper } = await open()
      await wrapper.get('[data-testid="confirm-reading"]').trigger('click')
      await flushPromises()
      expect(dialog().textContent).toContain('Liste indisponible')
    })

    it('queues one patch removing common.estimated on confirm, and forgets the estimate', async () => {
      const { wrapper } = await open(COPY)
      await wrapper.get('[data-testid="confirm-reading"]').trigger('click')
      await flushPromises()
      document.body.querySelector<HTMLElement>('[data-testid="estimated-confirm"]')!.click()
      await flushPromises()
      expect(enqueuePatch).toHaveBeenCalledExactlyOnceWith({
        period: expect.stringMatching(/^20\d\d-20\d\d$/),
        month: TWELFTH,
        field: 'common.estimated',
        value: null,
      })
      expect(estimates.has(TWELFTH)).toBe(false)
      expect(wrapper.find('[data-testid="estimated-notice"]').exists()).toBe(false)
    })

    it('removes the estimated Hc and Hp indexes when the month is switched to base', async () => {
      estimates.set(TWELFTH, { 'electricity.mainHc': 3, 'electricity.mainHp': 8 })
      const { fill } = await openForm(
        (json) => {
          estimatedMonth(json)
          // Hp was overtyped (9), Hc still holds its estimate.
          Object.assign(json.months[11].electricity, { tariffMode: 'hchp', mainHc: 3, mainHp: 9 })
        },
        TWELFTH,
        undefined,
        undefined,
        `${2040 + nth}-${2041 + nth++}`,
      )
      await fill('electricity.tariffMode', 'Base')
      const fields = enqueuePatch.mock.calls.map(([p]) => [p.field, p.value])
      expect(fields).toContainEqual(['electricity.mainHc', null])
      expect(fields).not.toContainEqual(['electricity.mainHp', null])
      expect(useToasts().toasts.value.map((t) => [t.level, t.message])).toContainEqual([
        'info',
        fr.period.estimated.staleCleared,
      ])
    })

    it('shows the closed notice with the date in a closed period only', async () => {
      const closed = await openForm(
        (json) => {
          ;(json as Record<string, unknown>).closedOn = '2027-09-01'
        },
        '2026-09',
        undefined,
        undefined,
        'closed',
      )
      expect(closed.wrapper.get('[data-testid="period-closed"]').text()).toContain('01/09/2027')
      const open = await openForm()
      expect(open.wrapper.find('[data-testid="period-closed"]').exists()).toBe(false)
    })

    it('enables no input in a closed period', async () => {
      const { wrapper } = await openForm(
        (json) => {
          ;(json as Record<string, unknown>).closedOn = '2027-09-01'
        },
        '2026-09',
        undefined,
        undefined,
        'closed',
      )
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBeGreaterThan(0)
      expect(inputs.every((input) => input.attributes('disabled') !== undefined)).toBe(true)
      expect(inputs.every((input) => input.classes('disabled:bg-muted'))).toBe(true)
    })

    it('disables the tariff mode and subscription unit switches in a closed period', async () => {
      const { wrapper } = await openForm(
        (json) => {
          ;(json as Record<string, unknown>).closedOn = '2027-09-01'
        },
        '2026-09',
        undefined,
        undefined,
        'closed',
      )
      const selects = wrapper.findAll('select[data-testid^="field-"]')
      expect(selects).toHaveLength(2)
      expect(selects.every((s) => s.attributes('disabled') !== undefined)).toBe(true)
    })

    it('offers neither notice nor confirmation in a closed period', async () => {
      const { wrapper } = await openForm(
        (json) => {
          estimatedMonth(json)
          ;(json as Record<string, unknown>).closedOn = '2027-09-01'
        },
        TWELFTH,
        undefined,
        undefined,
        'closed',
      )
      expect(wrapper.find('[data-testid="estimated-notice"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="confirm-reading"]').exists()).toBe(false)
    })
  })
})
