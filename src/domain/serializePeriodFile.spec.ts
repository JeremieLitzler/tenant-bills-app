import { describe, expect, it } from 'vitest'

import { validPeriodJson } from '../../tests/helpers/periodFile'
import type { PeriodFile } from './periodFile'
import { serializePeriodFile } from './serializePeriodFile'

describe('serializePeriodFile', () => {
  it('writes the keys in the order of docs/period-file.md, Previous before current', () => {
    const json = validPeriodJson()
    Object.assign(json.months[0].common, { estimated: true, startDate: '2026-09-12' })
    Object.assign(json.months[0].electricity, { mainBase: 2, mainBasePrevious: 1 })
    const text = serializePeriodFile(json as unknown as PeriodFile)
    const keys = (section: string) =>
      Object.keys(JSON.parse(text).months[0][section] as Record<string, unknown>)
    expect(keys('common')).toEqual(['startDate', 'tenantBillAdvance', 'estimated'])
    expect(keys('electricity')).toEqual(['mainBasePrevious', 'mainBase'])
  })

  it('ends with a newline and keeps unknown keys', () => {
    const json = { ...validPeriodJson(), extra: 1 }
    const text = serializePeriodFile(json as unknown as PeriodFile)
    expect(text.endsWith('}\n')).toBe(true)
    expect(JSON.parse(text).extra).toBe(1)
  })
})
