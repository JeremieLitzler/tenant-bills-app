// PROTOTYPE (#124) — throwaway. In-memory period, URL state and a quick completeness check (Q13).
import { computed, reactive, watch } from 'vue'

import example from '../../docs/examples/2026-2027.json'
import {
  LINES,
  SECTIONS,
  formatValue,
  isInactiveTariffLine,
  type PeriodLine,
} from '@/components/periods/periodLines'
import { computePeriodFigures, type MonthFigures } from '@/domain/periodFigures'
import type { MonthEntry, PeriodFile, SectionName } from '@/domain/periodFile'

const METERS = {
  waterConsumption: ['mainMeter', 'studioUnsoftenedMeter', 'studioSoftenedMeter'],
  electricity: ['mainBase', 'mainHc', 'mainHp', 'studioBase', 'studioHc', 'studioHp'],
} as const

type Bag = Record<string, string | number | undefined>

// The next month copied from `prev`, every index moved forward by `step`.
function nextMonth(prev: MonthEntry, month: string, endDate: string, step: number): MonthEntry {
  const m = structuredClone(prev)
  m.month = month
  m.common.startDate = prev.common.endDate
  m.common.endDate = endDate
  for (const [section, keys] of Object.entries(METERS)) {
    const s = m[section as keyof typeof METERS] as Bag
    for (const key of keys) {
      if (s[key] === undefined) continue
      s[`${key}Previous`] = s[key]
      s[key] = Number(s[key]) + step
    }
  }
  return m
}

const base = structuredClone(example) as unknown as PeriodFile
const oct = base.months[1]!
const nov = nextMonth(oct, '2026-11', '2026-12-11', 400)
;(nov.electricity as Bag).studioBase = Number(nov.electricity.studioBasePrevious) - 5 // a warning
const dec = nextMonth(nov, '2026-12', '2027-01-11', 400)
delete (dec.waterConsumption as Bag).mainMeter // incomplete
delete (dec.internet as Bag).billedAmount // incomplete
const jan = nextMonth(dec, '2027-01', '2027-02-11', 400)
jan.electricity.tariffMode = 'hchp' // HC/HP registers and prices missing: incomplete
base.months.push(nov, dec, jan)

export const file = reactive(base)
export const figures = computed(() => computePeriodFigures(file).months)

export const TABS = SECTIONS.filter((s) => s.id !== 'common')
export const linesOf = (section: SectionName) => LINES.filter((l) => l.section === section)

// URL state: ?page=table|form&variant=A|B|C&section=…&month=…
const q = new URLSearchParams(location.search)
export const url = reactive({
  page: q.get('page') ?? 'table',
  variant: q.get('variant') ?? 'A',
  section: q.get('section') ?? TABS[0]!.id,
  month: q.get('month') ?? oct.month,
})
watch(url, () => history.replaceState(null, '', `?${new URLSearchParams(url)}`), { immediate: true })

export const entryOf = (month: string) => file.months.find((m) => m.month === month)!
export const figuresOf = (month: string) => figures.value.find((f) => f.month === month)!

export function cellText(line: PeriodLine, entry: MonthEntry, fig: MonthFigures): string {
  if (isInactiveTariffLine(line, entry)) return ''
  const v = line.read(entry, fig)
  return v === undefined ? '—' : formatValue(line.kind, v)
}

// Q13: every required input present; the softener and the tariff mode are the exceptions.
function isComplete(entry: MonthEntry, section: SectionName): boolean {
  const s = entry[section] as Bag
  if (section === 'waterSoftener') {
    const q = s.quantity
    return Object.keys(s).length === 0 || q === 0 || (q !== undefined && s.unitPrice !== undefined && !!s.description)
  }
  return linesOf(section)
    .filter((l) => !l.computed && !isInactiveTariffLine(l, entry))
    .every((l) => s[l.id.split('.')[1]!] !== undefined)
}

// Q4/Q4b: a warning wins over complete; incomplete shows nothing.
export function sectionStatus(month: string, section: SectionName): 'warning' | 'complete' | 'none' {
  if (Object.keys(figuresOf(month).warnings).some((k) => k.startsWith(`${section}.`))) return 'warning'
  return isComplete(entryOf(month), section) ? 'complete' : 'none'
}
