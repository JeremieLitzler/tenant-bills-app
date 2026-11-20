import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { computePeriodFigures } from '@/domain/periodFigures'

import { validPeriodJson } from '../../../tests/helpers/periodFile'
import PeriodTable from './PeriodTable.vue'
import { LINES } from './periodLines'

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

function mountTable(periodId = '2026-2027') {
  addPeriod(periodId)
  return mount(PeriodTable, {
    props: { periodId },
    global: { plugins: [router] },
    attachTo: document.body,
  })
}

type W = ReturnType<typeof mountTable>
const grid = (w: W) => w.get('[data-testid="period-table"]')
const key = (w: W, k: string) => grid(w).trigger('keydown', { key: k })
const active = (w: W) => grid(w).attributes('aria-activedescendant')
const selectedCell = (w: W) => w.get('[aria-selected="true"]')
const lineOf = (w: W) => (selectedCell(w).element.closest('tr') as HTMLElement).dataset.testid
// The cell of the line at `lineIndex` in `LINES`, in month column `colIndex`.
const cellAt = (w: W, lineIndex: number, colIndex: number) =>
  w.get(`[data-testid="line-${LINES[lineIndex].id}"]`).findAll('td')[colIndex]

describe('period table month headers', () => {
  it('link each month to its Saisie du mois form', () => {
    const w = mountTable()
    const links = w.findAll('[data-testid="period-month"] a')
    expect(links).toHaveLength(12)
    expect(links[0].attributes('href')).toBe('/periods/2026-2027/months/2026-09')
  })
})

describe('period table selection', () => {
  it('is a single Tab stop whose active descendant is the first cell', () => {
    const w = mountTable()
    expect(grid(w).attributes('tabindex')).toBe('0')
    expect(w.findAll('[tabindex]')).toHaveLength(1)
    expect(active(w)).toBe(selectedCell(w).attributes('id'))
  })

  it('describes the table with the keyboard hint', () => {
    const w = mountTable()
    const hint = w.get(`#${grid(w).attributes('aria-describedby')}`)
    expect(hint.text()).toBe('💡 Naviguez dans le tableau avec les touches fléchées.')
  })

  it('moves one cell per arrow and stops at the top-left edges', async () => {
    const w = mountTable()
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
    const w = mountTable()
    await cellAt(w, LINES.length - 1, 11).trigger('click')
    const corner = active(w)
    await key(w, 'ArrowDown')
    await key(w, 'ArrowRight')
    expect(active(w)).toBe(corner)
  })

  it('skips the section header row between the last and first lines of two sections', async () => {
    const w = mountTable()
    // The first line that opens a section other than the first one.
    const next = LINES.findIndex((line) => line.section !== LINES[0].section)
    await cellAt(w, next - 1, 0).trigger('click')
    await key(w, 'ArrowDown')
    expect(lineOf(w)).toBe(`line-${LINES[next].id}`)
    await key(w, 'ArrowUp')
    expect(lineOf(w)).toBe(`line-${LINES[next - 1].id}`)
  })

  it('selects a clicked cell', async () => {
    const w = mountTable()
    const cell = cellAt(w, 3, 5)
    await cell.trigger('click')
    expect(active(w)).toBe(cell.attributes('id'))
    expect(cell.attributes('aria-selected')).toBe('true')
  })

  it('keeps the selection in a period that still has the cell', async () => {
    const w = mountTable()
    await cellAt(w, 2, 6).trigger('click')
    addPeriod('2027-2028')
    await w.setProps({ periodId: '2027-2028' })
    expect(lineOf(w)).toBe(`line-${LINES[2].id}`)
    expect(selectedCell(w).element).toBe(cellAt(w, 2, 6).element)
  })

  it('goes back to the first cell in a period that does not have the cell', async () => {
    const w = mountTable()
    await cellAt(w, 2, 6).trigger('click')
    addPeriod('2027-2028', 2)
    await w.setProps({ periodId: '2027-2028' })
    expect(selectedCell(w).element).toBe(cellAt(w, 0, 0).element)
  })
})

describe('period table is read-only', () => {
  enableAutoUnmount(afterEach)
  const OCCUPANTS = LINES.findIndex((line) => line.id === 'common.landlordOccupants')
  beforeEach(() => {
    setCell.mockClear()
    return router.push('/periods/2026-2027')
  })

  it('has no input and queues nothing when a character is typed', async () => {
    const w = mountTable()
    await cellAt(w, OCCUPANTS, 0).trigger('click')
    await key(w, '3')
    expect(w.find('input').exists()).toBe(false)
    expect(setCell).not.toHaveBeenCalled()
  })

  it('opens the form of the selected cell month with its field on Enter', async () => {
    const w = mountTable()
    await cellAt(w, OCCUPANTS, 1).trigger('click')
    await key(w, 'Enter')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/periods/2026-2027/months/2026-10')
    expect(router.currentRoute.value.query.field).toBe('common.landlordOccupants')
    expect(w.find('input').exists()).toBe(false)
  })

  it('does the same on a double click', async () => {
    const w = mountTable()
    await cellAt(w, OCCUPANTS, 2).trigger('dblclick')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/periods/2026-2027/months/2026-11')
    expect(router.currentRoute.value.query.field).toBe('common.landlordOccupants')
  })
})
