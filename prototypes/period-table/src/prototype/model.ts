// PROTOTYPE (issue #9): throwaway. Shared by the three versions so that only the
// table rendering differs. Inheritance, editability and parsing are simplified
// stand-ins for what src/domain/ will hold; computed values are placeholders.
import { reactive, ref } from 'vue'
import example from '@examples/2026-2027.json'

export type SectionId = 'common' | 'waterConsumption' | 'electricity'
type Values = Record<string, string | number>
export interface MonthEntry {
  month: string
  common: Values
  waterConsumption: Values
  electricity: Values
}
export interface PeriodFile {
  periodName: string
  settings: { monthlyTenantBillAdvance: number }
  months: MonthEntry[]
}
export interface Patch {
  period: string
  month: string
  field: string
  value: string | number | null
}

// --- Fixture: the example period file, with a few months typed in -------------

function fixture(): PeriodFile {
  const f = structuredClone(example) as unknown as PeriodFile
  const oct = f.months[1]
  oct.common.readingDate = '2026-11-15'
  Object.assign(oct.waterConsumption, { mainMeter: 540210, studioUnsoftenedMeter: 15102, studioSoftenedMeter: 20540 })
  // studioBase lower than September's: shows the warning.
  Object.assign(oct.electricity, { mainBase: 71498.1, studioBase: 2580.4 })
  const nov = f.months[2]
  nov.common.readingDate = '2026-12-13'
  nov.common.tenantOccupants = 2
  // January switches to HC/HP: a tariff-switch month, its HC/HP previous indexes are editable.
  const jan = f.months[4]
  Object.assign(jan.electricity, {
    tariffMode: 'hchp',
    mainHcPrevious: 0, mainHc: 112.4, mainHpPrevious: 0, mainHp: 260.9,
    studioHcPrevious: 0, studioHc: 21.3, studioHpPrevious: 0, studioHp: 49.8,
    kwhPriceHc: 0.0989, kwhPriceHp: 0.1295,
  })
  return f
}

export const file = reactive(fixture())
export const isClosed = ref(false)
export const patches = ref<Array<Patch | { rejected: string }>>([])
export const monthIds = file.months.map((m) => m.month)
export const monthLabels = monthIds.map((id) =>
  new Date(`${id}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
)

export function resetFixture() {
  Object.assign(file, fixture())
  patches.value = []
}

// --- Line definitions ----------------------------------------------------------

export type Kind = 'date' | 'int' | 'number' | 'money' | 'litres' | 'mode'
export type Tariff = 'base' | 'hchp'

export interface InputLine {
  type: 'input'
  id: string
  section: SectionId
  key: string
  label: string
  kind: Kind
  inherited: boolean
  tariff?: Tariff
  previousOf?: string // set on a "...Previous" line: the key of its current index
}
export interface ComputedLine {
  type: 'computed'
  id: string
  section: SectionId
  label: string
  compute: (month: number) => number | undefined
}
export type Line = InputLine | ComputedLine

export const sections: Array<{ id: SectionId; label: string }> = [
  { id: 'common', label: 'Commun' },
  { id: 'waterConsumption', label: "Consommation d'eau" },
  { id: 'electricity', label: 'Électricité' },
]

const input = (section: SectionId, key: string, label: string, kind: Kind, inherited: boolean, tariff?: Tariff): InputLine => ({
  type: 'input', id: `${section}.${key}`, section, key, label, kind, inherited, tariff,
})
const meter = (section: SectionId, key: string, label: string, kind: Kind, tariff?: Tariff): InputLine[] => [
  { ...input(section, `${key}Previous`, `${label} — index précédent`, kind, false, tariff), previousOf: key },
  input(section, key, `${label} — index actuel`, kind, true, tariff),
]

const waterShare: ComputedLine = {
  type: 'computed', id: 'waterConsumption.tenantShare', section: 'waterConsumption',
  label: 'Part Locataire (fictive)',
  compute: (m) => {
    const d1 = delta(m, 'waterConsumption', 'studioUnsoftenedMeter')
    const d2 = delta(m, 'waterConsumption', 'studioSoftenedMeter')
    const price = num(m, 'waterConsumption', 'pricePerM3')
    const vat = num(m, 'waterConsumption', 'vat')
    if ([d1, d2, price, vat].some((x) => x === undefined)) return undefined
    return ((d1! + d2!) / 1000) * price! * vat!
  },
}
const electricityShare: ComputedLine = {
  type: 'computed', id: 'electricity.tenantShare', section: 'electricity',
  label: 'Part Locataire (fictive)',
  compute: (m) => {
    const vat = num(m, 'electricity', 'vat')
    const regs = tariffMode(m) === 'base' ? ['Base'] : ['Hc', 'Hp']
    let total = 0
    for (const r of regs) {
      const d = delta(m, 'electricity', `studio${r}`)
      const price = num(m, 'electricity', `kwhPrice${r}`)
      if (d === undefined || price === undefined) return undefined
      total += d * price
    }
    return vat === undefined ? undefined : total * vat
  },
}

export const lines: Line[] = [
  input('common', 'readingDate', 'Au (date de relevé)', 'date', false),
  input('common', 'landlordOccupants', 'Occupants bailleur', 'int', true),
  input('common', 'tenantOccupants', 'Occupants locataire', 'int', true),
  input('common', 'tenantBillAdvance', 'Avance sur charges reçue', 'money', false),
  ...meter('waterConsumption', 'mainMeter', 'Compteur Général (m³)', 'litres'),
  ...meter('waterConsumption', 'studioUnsoftenedMeter', 'Studio non adoucie (m³)', 'litres'),
  ...meter('waterConsumption', 'studioSoftenedMeter', 'Studio adoucie (m³)', 'litres'),
  input('waterConsumption', 'pricePerM3', 'Prix au m³', 'number', true),
  input('waterConsumption', 'subscription', 'Abonnement', 'money', true),
  input('waterConsumption', 'vat', 'TVA', 'number', true),
  waterShare,
  input('electricity', 'tariffMode', 'Mode tarifaire', 'mode', true),
  ...meter('electricity', 'mainBase', 'Général Base (kWh)', 'number', 'base'),
  ...meter('electricity', 'mainHc', 'Général HC (kWh)', 'number', 'hchp'),
  ...meter('electricity', 'mainHp', 'Général HP (kWh)', 'number', 'hchp'),
  ...meter('electricity', 'studioBase', 'Studio Base (kWh)', 'number', 'base'),
  ...meter('electricity', 'studioHc', 'Studio HC (kWh)', 'number', 'hchp'),
  ...meter('electricity', 'studioHp', 'Studio HP (kWh)', 'number', 'hchp'),
  input('electricity', 'kwhPriceBase', 'Prix kWh Base', 'number', true, 'base'),
  input('electricity', 'kwhPriceHc', 'Prix kWh HC', 'number', true, 'hchp'),
  input('electricity', 'kwhPriceHp', 'Prix kWh HP', 'number', true, 'hchp'),
  input('electricity', 'subscriptionPerUnit', 'Abonnement (par unité)', 'money', true),
  input('electricity', 'vat', 'TVA', 'number', true),
  electricityShare,
]

// --- Inheritance ---------------------------------------------------------------

export type Source = 'typed' | 'inherited' | 'derived' | 'empty'

function stored(m: number, section: SectionId, key: string) {
  return file.months[m][section][key]
}

/** Value of a key in month m, following inheritance (I) or the previous month's current index. */
export function effective(m: number, line: InputLine): { value: string | number | undefined; source: Source } {
  const v = stored(m, line.section, line.key)
  if (v !== undefined) return { value: v, source: 'typed' }
  if (m === 0) return { value: undefined, source: 'empty' }
  if (line.previousOf) {
    const current = lines.find((l) => l.type === 'input' && l.key === line.previousOf && l.section === line.section) as InputLine
    const prev = effective(m - 1, current).value
    return { value: prev, source: prev === undefined ? 'empty' : 'derived' }
  }
  if (!line.inherited) return { value: undefined, source: 'empty' }
  const prev = effective(m - 1, line).value
  return { value: prev, source: prev === undefined ? 'empty' : 'inherited' }
}

function inputLine(section: SectionId, key: string) {
  return lines.find((l) => l.type === 'input' && l.section === section && l.key === key) as InputLine
}
function num(m: number, section: SectionId, key: string) {
  const v = effective(m, inputLine(section, key)).value
  return typeof v === 'number' ? v : undefined
}
function delta(m: number, section: SectionId, key: string) {
  const cur = num(m, section, key)
  const prev = num(m, section, `${key}Previous`)
  return cur === undefined || prev === undefined ? undefined : cur - prev
}
export function tariffMode(m: number): Tariff {
  return (effective(m, inputLine('electricity', 'tariffMode')).value as Tariff) ?? 'base'
}

// --- Cell view -----------------------------------------------------------------

export interface CellView {
  notApplicable: boolean
  computed: boolean
  text: string
  source: Source
  editable: boolean
  warning?: string
}

function isEditable(m: number, line: InputLine) {
  if (isClosed.value) return false
  if (line.tariff && tariffMode(m) !== line.tariff) return false
  if (line.previousOf) {
    const switchMonth = !!line.tariff && m > 0 && tariffMode(m - 1) !== tariffMode(m)
    return m === 0 || switchMonth // "Compteur remplacé" is left out of the prototype
  }
  return true
}

export function cellView(m: number, line: Line): CellView {
  if (line.type === 'computed') {
    const v = line.compute(m)
    return { notApplicable: false, computed: true, text: v === undefined ? '—' : format('money', v), source: 'derived', editable: false }
  }
  if (line.tariff && tariffMode(m) !== line.tariff) {
    return { notApplicable: true, computed: false, text: '', source: 'empty', editable: false }
  }
  const { value, source } = effective(m, line)
  let warning: string | undefined
  if (!line.previousOf && typeof value === 'number') {
    const prevLine = lines.find((l) => l.type === 'input' && l.previousOf === line.key && l.section === line.section) as InputLine | undefined
    const prev = prevLine && effective(m, prevLine).value
    if (typeof prev === 'number' && value < prev) warning = "Index inférieur à l'index précédent"
  }
  return {
    notApplicable: false, computed: false,
    text: value === undefined ? '' : format(line.kind, value),
    source, editable: isEditable(m, line), warning,
  }
}

// --- Formatting and parsing ----------------------------------------------------

function format(kind: Kind, v: string | number): string {
  switch (kind) {
    case 'date': return String(v).split('-').reverse().join('/')
    case 'litres': return (Number(v) / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })
    case 'money': return `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    case 'number': return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 5 })
    case 'int': return String(v)
    case 'mode': return v === 'hchp' ? 'HC/HP' : 'Base'
  }
}

export function editText(m: number, line: InputLine): string {
  const { value } = effective(m, line)
  if (value === undefined) return ''
  if (line.kind === 'date') return format('date', value)
  if (line.kind === 'litres') return (Number(value) / 1000).toFixed(3).replace('.', ',')
  return String(value).replace('.', ',')
}

function parse(kind: Kind, text: string): { ok: true; value: string | number | null } | { ok: false } {
  const t = text.trim()
  if (t === '') return { ok: true, value: null }
  if (kind === 'date') {
    const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t)
    if (fr) return { ok: true, value: `${fr[3]}-${fr[2]}-${fr[1]}` }
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? { ok: true, value: t } : { ok: false }
  }
  if (kind === 'mode') {
    const l = t.toLowerCase()
    if (l === 'base') return { ok: true, value: 'base' }
    if (l === 'hchp' || l === 'hc/hp') return { ok: true, value: 'hchp' }
    return { ok: false }
  }
  const n = Number(t.replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return { ok: false }
  if (kind === 'litres') return { ok: true, value: Math.round(n * 1000) }
  if (kind === 'int') return Number.isInteger(n) ? { ok: true, value: n } : { ok: false }
  return { ok: true, value: n }
}

/** Saves an edit: applies it to the local copy and logs the patch (stands in for the queue). */
export function commitEdit(m: number, line: InputLine, text: string, initial: string) {
  if (text === initial) return // nothing typed: an inherited value stays inherited
  const parsed = parse(line.kind, text)
  if (!parsed.ok) {
    patches.value.unshift({ rejected: `${monthIds[m]} ${line.id}: "${text}"` })
    return
  }
  let value = parsed.value
  if (value === null && line.key === 'tenantBillAdvance') value = 0
  const values = file.months[m][line.section]
  if (value === null) delete values[line.key]
  else values[line.key] = value
  patches.value.unshift({ period: file.periodName, month: monthIds[m], field: line.id, value })
}
