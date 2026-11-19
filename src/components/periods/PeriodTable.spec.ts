import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { computePeriodFigures } from '@/domain/periodFigures'

import { validPeriodJson } from '../../../tests/helpers/periodFile'
import PeriodTable from './PeriodTable.vue'
import { LINES } from './periodLines'

const loaded = vi.hoisted(() => ({ file: undefined as unknown, figures: undefined as unknown }))
vi.mock('@/composables/usePeriods', () => ({
  usePeriod: () => ({
    file: { value: loaded.file },
    figures: { value: loaded.figures },
  }),
}))

function mountTable() {
  const json = validPeriodJson()
  loaded.file = json
  loaded.figures = computePeriodFigures(json as never)
  return mount(PeriodTable, { props: { periodId: '2026-2027' }, attachTo: document.body })
}

type W = ReturnType<typeof mountTable>
const key = (w: W, k: string) =>
  w.get('[data-testid="period-table"]').trigger('keydown', { key: k })
const active = (w: W) => w.get('[data-testid="period-table"]').attributes('aria-activedescendant')

// Each key press re-renders the whole table in jsdom, so the walking tests get more time.
const SLOW = 30_000

describe('period table selection', () => {
  it('is a single Tab stop whose active descendant is the first cell', () => {
    const w = mountTable()
    expect(w.get('[data-testid="period-table"]').attributes('tabindex')).toBe('0')
    expect(w.findAll('[tabindex]')).toHaveLength(1)
    expect(active(w)).toBe(w.get('[aria-selected="true"]').attributes('id'))
  })

  it(
    'moves one cell per arrow and stops at the edges',
    async () => {
      const w = mountTable()
      const first = active(w)
      await key(w, 'ArrowUp')
      await key(w, 'ArrowLeft')
      expect(active(w)).toBe(first)
      await key(w, 'ArrowRight')
      expect(active(w)).not.toBe(first)
      await key(w, 'ArrowLeft')
      expect(active(w)).toBe(first)
      for (let i = 0; i < LINES.length + 3; i++) await key(w, 'ArrowDown')
      const last = active(w)
      await key(w, 'ArrowDown')
      expect(active(w)).toBe(last)
      for (let i = 0; i < 20; i++) await key(w, 'ArrowRight')
      const corner = active(w)
      await key(w, 'ArrowRight')
      expect(active(w)).toBe(corner)
    },
    SLOW,
  )

  it(
    'skips section header rows and visits every line in order',
    async () => {
      const w = mountTable()
      const rows: string[] = []
      for (let i = 0; i < LINES.length; i++) {
        rows.push(
          (w.get('[aria-selected="true"]').element.closest('tr') as HTMLElement).dataset.testid!,
        )
        await key(w, 'ArrowDown')
      }
      expect(rows).toEqual(LINES.map((l) => `line-${l.id}`))
    },
    SLOW,
  )

  it('selects a clicked cell', async () => {
    const w = mountTable()
    const cell = w.findAll('td')[5]
    await cell.trigger('click')
    expect(active(w)).toBe(cell.attributes('id'))
    expect(cell.attributes('aria-selected')).toBe('true')
  })
})
