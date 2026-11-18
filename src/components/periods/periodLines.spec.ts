// Keeps the table's lines and French labels in step with the period file. A failure here means the
// file schema (src/domain/periodFile.ts) or the figures (src/domain/periodFigures.ts) changed:
// add the line to LINES and its label to fr.period.table.lines, or list the key in NOT_A_LINE.
import { describe, expect, it } from 'vitest'

import { computePeriodFigures } from '@/domain/periodFigures'
import { FIELD_CATALOGUE, type SectionName } from '@/domain/periodFile'
import { fr } from '@/i18n/fr'

import { validPeriodJson } from '../../../tests/helpers/periodFile'
import { LINES, SECTIONS } from './periodLines'

// Keys of a shown section that are deliberately not a table line, each with its reason.
const NOT_A_LINE: Record<string, string> = {
  'common.estimated': 'a flag of the estimated twelfth month, not a figure (docs/period-file.md)',
}

// Computed figures that repeat an input line already shown, each with its reason.
const NOT_A_FIGURE_LINE: Record<string, string> = {
  'internet.bill': 'equals the internet.billedAmount line',
  'heatPumpMaintenance.bill': 'equals the heatPumpMaintenance.billedAmount line',
}

const lineIds = LINES.map((line) => line.id)
const sections = SECTIONS.map((section) => section.id as SectionName)

describe('period table lines', () => {
  it('has a line for every input key of every shown section', () => {
    const expected = sections.flatMap((section) =>
      Object.keys(FIELD_CATALOGUE[section]).map((key) => `${section}.${key}`),
    )
    const missing = expected.filter((id) => !lineIds.includes(id) && !(id in NOT_A_LINE))
    expect(missing).toEqual([])
  })

  it('has a line for every computed figure of every shown section', () => {
    const figures = computePeriodFigures(validPeriodJson() as never).months[0]
    const expected = sections.flatMap((section) =>
      Object.keys((figures as unknown as Record<string, object>)[section] ?? {}).map(
        (key) => `${section}.${key}`,
      ),
    )
    expect(expected.filter((id) => !lineIds.includes(id) && !(id in NOT_A_FIGURE_LINE))).toEqual([])
  })

  it('has a French label for every line, and no label without a line', () => {
    const labels = fr.period.table.lines as Record<string, string>
    expect(lineIds.filter((id) => !labels[id])).toEqual([])
    expect(Object.keys(labels).filter((id) => !lineIds.includes(id))).toEqual([])
  })

  it('has no duplicate line and a label for every section', () => {
    expect(new Set(lineIds).size).toBe(lineIds.length)
    expect(SECTIONS.filter((section) => !section.label)).toEqual([])
    expect(LINES.filter((line) => !sections.includes(line.section))).toEqual([])
  })
})
