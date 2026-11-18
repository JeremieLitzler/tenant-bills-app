// The period file as written to the data repo (docs/period-file.md, "Writing"): two-space
// indentation, keys in the document's order with each `...Previous` key right before its current
// key, and a trailing newline, so a commit's diff shows only the edited cells. Vue-free.
import { FIELD_CATALOGUE } from './periodFile'
import type { PeriodFile } from './periodFile'

type Bag = Record<string, unknown>

const TOP_LEVEL_ORDER = [
  'schemaVersion',
  'periodName',
  'tenantName',
  'monthlyTenantBillAdvance',
  'heatPumpInvoiceEstimate',
  'closedOn',
  'months',
]

// Known keys first in `order`, then any unknown key as found (never dropped).
function inOrder(bag: Bag, order: string[]): Bag {
  const known = order.filter((key) => key in bag)
  const rest = Object.keys(bag).filter((key) => !order.includes(key))
  return Object.fromEntries([...known, ...rest].map((key) => [key, bag[key]]))
}

function sectionOrder(keys: string[]): string[] {
  return keys
    .filter((key) => !key.endsWith('Previous'))
    .flatMap((key) => (keys.includes(`${key}Previous`) ? [`${key}Previous`, key] : [key]))
}

export function serializePeriodFile(file: PeriodFile): string {
  const sections = Object.keys(FIELD_CATALOGUE)
  const months = file.months.map((entry) => {
    const ordered = inOrder(entry as unknown as Bag, ['month', ...sections])
    for (const section of sections) {
      ordered[section] = inOrder(
        ordered[section] as Bag,
        sectionOrder(Object.keys(FIELD_CATALOGUE[section as keyof typeof FIELD_CATALOGUE])),
      )
    }
    return ordered
  })
  const ordered = inOrder({ ...file, months } as unknown as Bag, TOP_LEVEL_ORDER)
  return `${JSON.stringify(ordered, null, 2)}\n`
}
