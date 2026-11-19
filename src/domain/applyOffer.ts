// Case 8 (docs/scenarios.md): what to offer after a value of a month that has later months is
// edited. Vue-free.
import { FIELD_CATALOGUE, type ReadonlyPeriodFile, type SectionName } from './periodFile'

export interface OfferPatch {
  month: string
  field: string
  value: unknown
}

// "inherited": the new value for every later month. "index": the next month's previous index.
export interface Offer {
  kind: 'inherited' | 'index'
  patches: OfferPatch[]
}

// No equality guard: a later month holding another value is overwritten (IMPACT-05, Q22 and Q23).
export function applyOffer(
  file: Pick<ReadonlyPeriodFile, 'months'>,
  month: string,
  field: string,
  value: unknown,
): Offer | undefined {
  const later = file.months.filter((entry) => entry.month > month)
  if (!later.length) return undefined
  const [section, key] = field.split('.') as [SectionName, string]
  const catalogue = FIELD_CATALOGUE[section] as Record<string, string>
  if (catalogue[key] === 'inherited') {
    return {
      kind: 'inherited',
      patches: later.map((entry) => ({ month: entry.month, field, value })),
    }
  }
  if (`${key}Previous` in catalogue) {
    return { kind: 'index', patches: [{ month: later[0].month, field: `${field}Previous`, value }] }
  }
  return undefined
}
