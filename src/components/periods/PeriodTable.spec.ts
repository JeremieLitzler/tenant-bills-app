import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { computePeriodFigures } from '@/domain/periodFigures'

import { validPeriodJson } from '../../../tests/helpers/periodFile'
import PeriodTable from './PeriodTable.vue'
import { LINES } from './periodLines'

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
  return mount(PeriodTable, { props: { periodId }, attachTo: document.body })
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

describe('period table editing', () => {
  const lineIndex = (id: string) => LINES.findIndex((line) => line.id === id)
  const OCCUPANTS = lineIndex('common.landlordOccupants')
  const MAIN_METER = lineIndex('waterConsumption.mainMeter')
  const input = (w: W) => w.get('input')
  const type = (w: W, text: string) => input(w).setValue(text)
  const inEditMode = (w: W) => w.find('input').exists()
  // A table whose first month has 2 landlord occupants and a "base" tariff.
  function mountEditable(readOnly = false) {
    addPeriod('2026-2027')
    const file = periods['2026-2027'].file as { months: Record<string, Record<string, unknown>>[] }
    file.months[0].common.landlordOccupants = 2
    file.months[0].electricity.tariffMode = 'base'
    periods['2026-2027'].figures = computePeriodFigures(file as never)
    periods['2026-2027'].readOnly = readOnly
    return mount(PeriodTable, { props: { periodId: '2026-2027' }, attachTo: document.body })
  }
  // Selects the first month's cell of the line, then opens its editor.
  async function edit(w: W, lineIdx: number) {
    await cellAt(w, lineIdx, 0).trigger('click')
    await key(w, 'Enter')
  }
  beforeEach(() => setCell.mockClear())

  it('starts editing on Enter, with the value as text', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    expect(input(w).element.value).toBe('2')
  })

  it('does nothing on Enter in a computed cell', async () => {
    const w = mountEditable()
    await edit(w, lineIndex('waterConsumption.deltaMain'))
    expect(inEditMode(w)).toBe(false)
  })

  it('does nothing on Enter in a cell of the inactive tariff', async () => {
    const w = mountEditable()
    await edit(w, lineIndex('electricity.kwhPriceHc'))
    expect(inEditMode(w)).toBe(false)
  })

  it('does not edit a read-only period', async () => {
    const w = mountEditable(true)
    await edit(w, OCCUPANTS)
    expect(inEditMode(w)).toBe(false)
  })

  it('starts editing with the typed character replacing the value', async () => {
    const w = mountEditable()
    await cellAt(w, OCCUPANTS, 0).trigger('click')
    await key(w, '3')
    expect(input(w).element.value).toBe('3')
  })

  it('starts editing on a double click', async () => {
    const w = mountEditable()
    await cellAt(w, OCCUPANTS, 0).trigger('dblclick')
    expect(input(w).element.value).toBe('2')
  })

  it('queues the patch on blur', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    await type(w, '4')
    await input(w).trigger('blur')
    expect(setCell).toHaveBeenCalledExactlyOnceWith('2026-09', 'common.landlordOccupants', 4)
    expect(inEditMode(w)).toBe(false)
  })

  it('queues nothing for an unchanged text', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    await input(w).trigger('blur')
    expect(setCell).not.toHaveBeenCalled()
  })

  it('queues a removal for an emptied cell', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    await type(w, '')
    await input(w).trigger('blur')
    expect(setCell).toHaveBeenCalledExactlyOnceWith('2026-09', 'common.landlordOccupants', null)
  })

  it('queues nothing for a text that is not a value', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    await type(w, 'abc')
    await input(w).trigger('blur')
    expect(setCell).not.toHaveBeenCalled()
  })

  it('keeps the editor open and marked on Enter with a text that is not a value', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    await type(w, 'abc')
    await key(w, 'Enter')
    expect(setCell).not.toHaveBeenCalled()
    expect(lineOf(w)).toBe(`line-${LINES[OCCUPANTS].id}`)
    expect(input(w).attributes('aria-invalid')).toBe('true')
    await type(w, '3')
    expect(input(w).attributes('aria-invalid')).toBe('false')
    // Leave edit mode so the next test's focus does not save this editor's text.
    await key(w, 'Escape')
  })

  it('saves when another cell is selected', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    await type(w, '5')
    await cellAt(w, OCCUPANTS, 1).trigger('click')
    expect(setCell).toHaveBeenCalledExactlyOnceWith('2026-09', 'common.landlordOccupants', 5)
    expect(inEditMode(w)).toBe(false)
  })

  it('saves on Enter and moves to the next editable cell down, staying in edit mode', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    await type(w, '4')
    await key(w, 'Enter')
    expect(setCell).toHaveBeenCalledExactlyOnceWith('2026-09', 'common.landlordOccupants', 4)
    expect(lineOf(w)).toBe(`line-${LINES[OCCUPANTS + 1].id}`)
    expect(inEditMode(w)).toBe(true)
  })

  it('saves on Enter in the last editable cell and returns to selection mode', async () => {
    const w = mountEditable()
    const last = LINES.length - 1
    await edit(w, last)
    await type(w, '12')
    await key(w, 'Enter')
    expect(setCell).toHaveBeenCalledExactlyOnceWith('2026-09', LINES[last].id, 12)
    expect(inEditMode(w)).toBe(false)
    expect(lineOf(w)).toBe(`line-${LINES[last].id}`)
  })

  it('restores the value on Escape and queues nothing', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    await type(w, '9')
    await key(w, 'Escape')
    expect(inEditMode(w)).toBe(false)
    expect(cellAt(w, OCCUPANTS, 0).text()).toBe('2')
    expect(setCell).not.toHaveBeenCalled()
  })

  it('keeps the arrows for the text cursor in edit mode', async () => {
    const w = mountEditable()
    await edit(w, OCCUPANTS)
    const selected = active(w)
    await key(w, 'ArrowLeft')
    await key(w, 'ArrowRight')
    expect(active(w)).toBe(selected)
    expect(inEditMode(w)).toBe(true)
  })

  it('queues a water index typed in m³ in litres', async () => {
    const w = mountEditable()
    await edit(w, MAIN_METER)
    await type(w, '12,5')
    await input(w).trigger('blur')
    expect(setCell).toHaveBeenCalledExactlyOnceWith('2026-09', 'waterConsumption.mainMeter', 12500)
  })
})
