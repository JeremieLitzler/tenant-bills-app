import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { computePeriodFigures } from '@/domain/periodFigures'

import { validPeriodJson } from '@tests/helpers/periodFile'
import PeriodTable from './PeriodTable.vue'
import { LINES, SECTIONS } from './periodLines'

type Figures = ReturnType<typeof computePeriodFigures>

const ALL_OPEN = SECTIONS.map((section) => section.id)
  .filter((id) => id !== 'common')
  .join(',')

// Month headers link to the form; the table needs a router to resolve them.
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:p(.*)*', component: { template: '<i />' } }],
})

// The periods by id, so a test can give the second period fewer months.
const periods = vi.hoisted(
  () => ({}) as Record<string, { file: unknown; figures: unknown; readOnly?: boolean }>,
)
const setCell = vi.hoisted(() => vi.fn())
vi.mock('@/composables/usePeriods', () => ({
  usePeriod: (id: () => string) => ({
    setCell,
    isReadOnly: {
      get value() {
        return periods[id()]?.readOnly ?? false
      },
    },
    file: {
      get value() {
        return periods[id()]?.file
      },
    },
    figures: {
      get value() {
        return periods[id()]?.figures
      },
    },
  }),
}))

function addPeriod(id: string, monthCount = 12) {
  const json = validPeriodJson() as { months: unknown[] }
  json.months = json.months.slice(0, monthCount)
  periods[id] = { file: json, figures: computePeriodFigures(json as never) }
}

// Every section open unless `open` says otherwise: most tests need the cells to be there.
async function mountTable(
  periodId = '2026-2027',
  open = ALL_OPEN,
  adjust?: (figures: Figures) => void,
) {
  addPeriod(periodId)
  adjust?.(periods[periodId].figures as Figures)
  await router.push({ path: `/periods/${periodId}`, query: open ? { open } : {} })
  return mount(PeriodTable, {
    props: { periodId },
    global: { plugins: [router] },
    attachTo: document.body,
  })
}

enableAutoUnmount(afterEach)

type W = Awaited<ReturnType<typeof mountTable>>
const grid = (w: W) => w.get('[data-testid="period-table"]')
const key = (w: W, k: string) => grid(w).trigger('keydown', { key: k })
const active = (w: W) => grid(w).attributes('aria-activedescendant')
const selectedCell = (w: W) => w.get('[aria-selected="true"]')
const lineOf = (w: W) => (selectedCell(w).element.closest('tr') as HTMLElement).dataset.testid
// The cell of the line at `lineIndex` in `LINES`, in month column `colIndex`.
const cellAt = (w: W, lineIndex: number, colIndex: number) =>
  w.get(`[data-testid="line-${LINES[lineIndex].id}"]`).findAll('td:not([data-testid="total"])')[
    colIndex
  ]

describe('period table month headers', () => {
  it('link each month to its Saisie du mois form', async () => {
    const w = await mountTable()
    const links = w.findAll('[data-testid="period-month"] a')
    expect(links).toHaveLength(12)
    // The open sections travel with the link, so coming back keeps them.
    expect(links[0].attributes('href')).toBe(`/periods/2026-2027/months/2026-09?open=${ALL_OPEN}`)
  })
})

describe('period totals column', () => {
  const totalCell = (w: W, id: string) => w.get(`[data-testid="line-${id}"] [data-testid="total"]`)
  // A section's total is on its header row, so a closed section still shows it.
  const sectionTotal = (w: W, id: string) =>
    w.get(`[data-testid="section-${id}"] [data-testid="total"]`)

  it('follows the months with the advances and each section tenant share totals', async () => {
    const w = await mountTable()
    const { totals } = periods['2026-2027'].figures as Figures
    expect(totalCell(w, 'common.tenantBillAdvance').text()).toBe(
      totals.advancesReceived.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
    )
    expect(sectionTotal(w, 'internet').text()).not.toBe('')
    expect(totalCell(w, 'internet.tenantShare').text()).toBe('')
    // A line without a total in the spreadsheet stays empty, and the column is read-only.
    expect(totalCell(w, 'internet.billedAmount').text()).toBe('')
    expect(w.find('[data-testid="total"] input').exists()).toBe(false)
  })

  it.each([
    ['waterConsumption', 'waterConsumptionTenant'],
    ['waterTreatment', 'waterTreatmentTenant'],
    ['waterSoftener', 'waterSoftenerTenant'],
    ['electricity', 'electricityTenant'],
    ['internet', 'internetTenant'],
    ['heatPumpMaintenance', 'heatPumpMaintenanceTenant'],
  ] as const)('shows the %s total as a dash when a month is uncomputable', async (id, total) => {
    const w = await mountTable('2026-2027', ALL_OPEN, (f) => {
      f.totals[total] = undefined
    })
    expect(sectionTotal(w, id).text()).toBe('—')
  })

  it('puts the Total column right after the label column', async () => {
    const w = await mountTable()
    const headers = w.findAll('thead th')
    expect(headers[0].text()).toBe('Ligne')
    expect(headers[1].text()).toBe('Total')
  })

  it('repeats the section total in each month of its header row, for the phone', async () => {
    const w = await mountTable()
    const cells = w.findAll('[data-testid="section-electricity"] [data-testid="year-total"]')
    expect(cells).toHaveLength(12)
    expect(cells[0].text()).toBe(`Total annuel : ${sectionTotal(w, 'electricity').text()}`)
  })

  it('shows a section total on its header row when the section is closed', async () => {
    const w = await mountTable('2026-2027', '')
    expect(sectionTotal(w, 'electricity').text()).not.toBe('')
  })
})

describe('period table selection', () => {
  it('is a single Tab stop whose active descendant is the first cell', async () => {
    const w = await mountTable()
    expect(grid(w).attributes('tabindex')).toBe('0')
    expect(w.findAll('[tabindex]:not([tabindex="-1"])')).toHaveLength(1)
    expect(active(w)).toBe(selectedCell(w).attributes('id'))
  })

  it('describes the table with the keyboard hint', async () => {
    const w = await mountTable()
    const hint = w.get(`#${grid(w).attributes('aria-describedby')}`)
    expect(hint.text()).toBe('💡 Naviguez dans le tableau avec les touches fléchées.')
  })

  it('moves one cell per arrow and stops at the top-left edges', async () => {
    const w = await mountTable()
    const first = active(w)
    await key(w, 'ArrowUp')
    await key(w, 'ArrowLeft')
    expect(active(w)).toBe(first)
    await key(w, 'ArrowRight')
    expect(active(w)).not.toBe(first)
    await key(w, 'ArrowDown')
    await key(w, 'ArrowLeft')
    await key(w, 'ArrowUp')
    expect(active(w)).toBe(first)
  })

  it('stops at the bottom-right corner', async () => {
    const w = await mountTable()
    await cellAt(w, LINES.length - 1, 11).trigger('click')
    const corner = active(w)
    await key(w, 'ArrowDown')
    await key(w, 'ArrowRight')
    expect(active(w)).toBe(corner)
  })

  it('visits the section header row between the last and first lines of two sections', async () => {
    const w = await mountTable()
    const next = LINES.findIndex((line) => line.section !== LINES[0].section)
    await cellAt(w, next - 1, 0).trigger('click')
    await key(w, 'ArrowDown')
    expect(active(w)).toBe(w.get('[data-testid="section-waterConsumption"]').attributes('id'))
    await key(w, 'ArrowDown')
    expect(lineOf(w)).toBe(`line-${LINES[next].id}`)
    await key(w, 'ArrowUp')
    await key(w, 'ArrowUp')
    expect(lineOf(w)).toBe(`line-${LINES[next - 1].id}`)
  })

  it('selects a clicked cell', async () => {
    const w = await mountTable()
    const cell = cellAt(w, 3, 5)
    await cell.trigger('click')
    expect(active(w)).toBe(cell.attributes('id'))
    expect(cell.attributes('aria-selected')).toBe('true')
  })

  it('keeps the selection in a period that still has the cell', async () => {
    const w = await mountTable()
    await cellAt(w, 2, 6).trigger('click')
    addPeriod('2027-2028')
    await w.setProps({ periodId: '2027-2028' })
    expect(lineOf(w)).toBe(`line-${LINES[2].id}`)
    expect(selectedCell(w).element).toBe(cellAt(w, 2, 6).element)
  })

  it('goes back to the first cell in a period that does not have the cell', async () => {
    const w = await mountTable()
    await cellAt(w, 2, 6).trigger('click')
    addPeriod('2027-2028', 2)
    await w.setProps({ periodId: '2027-2028' })
    expect(selectedCell(w).element).toBe(cellAt(w, 0, 0).element)
  })
})

describe('period table is read-only', () => {
  const OCCUPANTS = LINES.findIndex((line) => line.id === 'common.landlordOccupants')
  beforeEach(() => {
    setCell.mockClear()
    return router.push('/periods/2026-2027')
  })

  it('has no input and queues nothing when a character is typed', async () => {
    const w = await mountTable()
    await cellAt(w, OCCUPANTS, 0).trigger('click')
    await key(w, '3')
    expect(w.find('input').exists()).toBe(false)
    expect(setCell).not.toHaveBeenCalled()
  })

  it('opens the form of the selected cell month with its field on Enter', async () => {
    const w = await mountTable()
    await cellAt(w, OCCUPANTS, 1).trigger('click')
    await key(w, 'Enter')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/periods/2026-2027/months/2026-10')
    expect(router.currentRoute.value.query.field).toBe('common.landlordOccupants')
    expect(w.find('input').exists()).toBe(false)
  })

  it('does the same on a double click', async () => {
    const w = await mountTable()
    await cellAt(w, OCCUPANTS, 2).trigger('dblclick')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/periods/2026-2027/months/2026-11')
    expect(router.currentRoute.value.query.field).toBe('common.landlordOccupants')
  })
})

describe('period table collapsible sections', () => {
  const header = (w: W, id: string) => w.get(`[data-testid="section-${id}"] button`)
  const hasLine = (w: W, id: string) => w.find(`[data-testid="line-${id}"]`).exists()

  it('shows every section closed and the common lines when nothing is in the URL', async () => {
    const w = await mountTable('2026-2027', '')
    expect(hasLine(w, 'common.startDate')).toBe(true)
    expect(hasLine(w, 'internet.billedAmount')).toBe(false)
    expect(header(w, 'internet').attributes('aria-expanded')).toBe('false')
    expect(w.find('[data-testid="section-common"]').exists()).toBe(false)
  })

  it('opens and closes a section from its header with the mouse, writing ?open=', async () => {
    const w = await mountTable('2026-2027', '')
    await header(w, 'internet').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.open).toBe('internet')
    expect(header(w, 'internet').attributes('aria-expanded')).toBe('true')
    expect(hasLine(w, 'internet.billedAmount')).toBe(true)
    await header(w, 'internet').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.open).toBeUndefined()
    expect(hasLine(w, 'internet.billedAmount')).toBe(false)
  })

  it('opens and closes the selected header with Enter and Space', async () => {
    const w = await mountTable('2026-2027', '')
    await header(w, 'internet').trigger('click')
    await flushPromises()
    await key(w, 'Enter')
    await flushPromises()
    expect(header(w, 'internet').attributes('aria-expanded')).toBe('false')
    await key(w, ' ')
    await flushPromises()
    expect(header(w, 'internet').attributes('aria-expanded')).toBe('true')
  })

  it('opens a section with ArrowRight and closes it with ArrowLeft on its header', async () => {
    const w = await mountTable('2026-2027', '')
    await header(w, 'internet').trigger('click')
    await flushPromises()
    await key(w, 'ArrowLeft')
    await flushPromises()
    expect(header(w, 'internet').attributes('aria-expanded')).toBe('false')
    await key(w, 'ArrowRight')
    await flushPromises()
    expect(header(w, 'internet').attributes('aria-expanded')).toBe('true')
  })

  it('skips the rows of closed sections with the arrows', async () => {
    const w = await mountTable('2026-2027', 'internet')
    const lastCommon = LINES.filter((l) => l.section === 'common').length - 1
    await cellAt(w, lastCommon, 0).trigger('click')
    await key(w, 'ArrowDown')
    expect(active(w)).toBe(w.get('[data-testid="section-waterConsumption"]').attributes('id'))
    await key(w, 'ArrowDown')
    expect(active(w)).toBe(w.get('[data-testid="section-waterTreatment"]').attributes('id'))
  })

  it('moves the selection to the header when its section closes', async () => {
    const w = await mountTable('2026-2027', 'internet')
    await cellAt(
      w,
      LINES.findIndex((l) => l.id === 'internet.billedAmount'),
      2,
    ).trigger('click')
    await header(w, 'internet').trigger('click')
    await flushPromises()
    expect(active(w)).toBe(w.get('[data-testid="section-internet"]').attributes('id'))
  })

  it('ignores an unknown section name', async () => {
    const w = await mountTable('2026-2027', 'nope,internet')
    expect(header(w, 'internet').attributes('aria-expanded')).toBe('true')
    expect(hasLine(w, 'common.startDate')).toBe(true)
  })

  it('opens the cell section in the form it opens', async () => {
    const w = await mountTable('2026-2027', 'electricity')
    await cellAt(
      w,
      LINES.findIndex((l) => l.id === 'electricity.vat'),
      0,
    ).trigger('dblclick')
    await flushPromises()
    expect(router.currentRoute.value.query.open).toBe('electricity')
    const w2 = await mountTable('2026-2027', '')
    await header(w2, 'internet').trigger('click')
    await flushPromises()
    await cellAt(
      w2,
      LINES.findIndex((l) => l.id === 'internet.billedAmount'),
      0,
    ).trigger('dblclick')
    await flushPromises()
    expect(router.currentRoute.value.query.open).toBe('internet')
  })
})

describe('softener, internet and heat pump sections', () => {
  const cells = (w: W, id: string) =>
    w
      .get(`[data-testid="line-${id}"]`)
      .findAll('td:not([data-testid="total"])')
      .map((td) => td.text())

  // Fills the period before mounting: the figures are computed from the edited file.
  async function mountWithPurchases() {
    addPeriod('2026-2027')
    const json = periods['2026-2027'].file as { months: Record<string, Record<string, unknown>>[] }
    json.months.forEach((m) =>
      Object.assign(m.common, { landlordOccupants: 1, tenantOccupants: 1 }),
    )
    Object.assign(json.months[1].waterSoftener, { description: 'Sel', quantity: 2, unitPrice: 10 })
    Object.assign(json.months[2].heatPumpMaintenance, { billedAmount: 12.5 })
    json.months[0].internet.billedAmount = 20
    periods['2026-2027'].figures = computePeriodFigures(json as never)
    await router.push({ path: '/periods/2026-2027', query: { open: ALL_OPEN } })
    return mount(PeriodTable, {
      props: { periodId: '2026-2027' },
      global: { plugins: [router] },
      attachTo: document.body,
    })
  }

  it('shows the three sections with their French labels', async () => {
    const w = await mountWithPurchases()
    for (const id of ['waterSoftener', 'internet', 'heatPumpMaintenance']) {
      expect(w.get(`[data-testid="section-${id}"]`).text()).toContain(
        SECTIONS.find((s) => s.id === id)!.label,
      )
    }
    expect(w.get('[data-testid="line-waterSoftener.unitPrice"]').text()).toContain('Prix unitaire')
    expect(w.get('[data-testid="line-internet.tenantShare"]').text()).toContain('Part locataire')
    expect(w.get('[data-testid="line-heatPumpMaintenance.billedAmount"]').text()).toContain(
      'Montant du mois (locataire)',
    )
  })

  it('shows a purchase or an amount only in its own month, with the computed shares', async () => {
    const w = await mountWithPurchases()
    const filled = (id: string) => cells(w, id).map((t) => t !== '')
    expect(filled('waterSoftener.unitPrice')).toEqual([...Array(12)].map((_, i) => i === 1))
    expect(filled('heatPumpMaintenance.billedAmount')).toEqual(
      [...Array(12)].map((_, i) => i === 2),
    )
    expect(cells(w, 'waterSoftener.tenantShare')[1]).toContain('10,00')
    expect(cells(w, 'heatPumpMaintenance.billedAmount')[2]).toContain('12,50')
    expect(cells(w, 'internet.landlordShare')[0]).toContain('10,00')
  })

  it('marks the month holding common.estimated as estimated, and no other', async () => {
    addPeriod('2026-2027')
    ;(
      periods['2026-2027'].file as { months: { common: Record<string, unknown> }[] }
    ).months[11].common.estimated = true
    await router.push({ path: '/periods/2026-2027', query: { open: ALL_OPEN } })
    const w = mount(PeriodTable, {
      props: { periodId: '2026-2027' },
      global: { plugins: [router] },
      attachTo: document.body,
    })
    const heads = w.findAll('[data-testid="period-month"]')
    expect(heads[11].find('[data-testid="estimated-badge"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="estimated-badge"]')).toHaveLength(1)
  })

  it('keeps the estimated mark in a closed period', async () => {
    addPeriod('2026-2028')
    const file = periods['2026-2028'].file as {
      closedOn?: string
      months: { common: Record<string, unknown> }[]
    }
    file.closedOn = '2027-09-01'
    file.months[11].common.estimated = true
    await router.push({ path: '/periods/2026-2028', query: { open: ALL_OPEN } })
    const w = mount(PeriodTable, {
      props: { periodId: '2026-2028' },
      global: { plugins: [router] },
      attachTo: document.body,
    })
    expect(w.findAll('[data-testid="estimated-badge"]')).toHaveLength(1)
  })
})
