// The subject (and body) of a drain commit (docs/architecture.md, "Data commits"). Vue-free.
import { MONTH_FIELD, type Patch } from './applyPatch'

const edits = (count: number) => `${count} ${count === 1 ? 'edit' : 'edits'}`

// `patches` all belong to `period`. A month initialization uses its own subject; the other edits
// queued with it are counted in the body.
export function commitMessage(period: string, patches: Patch[]): string {
  const initialized = patches.find((patch) => patch.field === MONTH_FIELD)
  const counted = patches.filter((patch) => patch.field !== MONTH_FIELD)
  const perMonth = new Map<string, number>()
  let settings = 0
  for (const patch of counted) {
    if (patch.month === null) settings++
    else perMonth.set(patch.month, (perMonth.get(patch.month) ?? 0) + 1)
  }
  const months = [...perMonth.keys()].sort()
  const lines = [
    ...months.map((month) => `${month}: ${edits(perMonth.get(month) as number)}`),
    ...(settings ? [`settings: ${edits(settings)}`] : []),
  ]
  const body = initialized || lines.length > 1 ? `\n\n${lines.join('\n')}` : ''
  if (initialized) {
    return `data(${period}): initialize ${initialized.month}${lines.length ? body : ''}`
  }
  const where = [
    ...(months.length ? [months.length === 1 ? months[0] : `${months.length} months`] : []),
    ...(settings ? ['settings'] : []),
  ].join(' and ')
  return `data(${period}): ${edits(counted.length)} in ${where}${body}`
}
