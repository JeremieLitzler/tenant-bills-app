// The lines of the period table, in display order: one definition per row, reused by the "Saisie du
// mois" form (F6). A line is an input of the period file or a computed figure. More sections join
// as their figures land (F4).
import { ELECTRICITY_TARIFFS, TARIFFS_BY_MODE, type ElectricityTariff } from '@/domain/electricityTariffs'
import type { MonthFigures } from '@/domain/periodFigures'
import type { MonthEntry, SectionInputs, SectionName } from '@/domain/periodFile'
import { fr } from '@/i18n/fr'

export type LineKind = 'date' | 'int' | 'money' | 'number' | 'litres' | 'm3' | 'text'


type FigureSection = 'waterConsumption' | 'waterTreatment' | 'waterSoftener' | 'electricity' | 'internet'

export interface PeriodLine {
  id: string
  section: SectionName
  label: string
  kind: LineKind
  computed: boolean
  // The tariff of an electricity line that only applies in one tariff mode (empty in the other).
  tariff?: ElectricityTariff
  // The cell's value: as stored in the month (docs/period-file.md) or from the figures (computed).
  read: (entry: MonthEntry, figures: MonthFigures) => string | number | undefined
}

export const SECTIONS = (['common', 'waterConsumption', 'waterTreatment', 'waterSoftener', 'electricity', 'internet', 'heatPumpMaintenance'] as const).map((id) => ({
  id,
  label: fr.period.table.sections[id],
}))

const labelOf = (id: string) => fr.period.table.lines[id as keyof typeof fr.period.table.lines]

function input<S extends SectionName>(
  section: S,
  key: keyof SectionInputs[S] & string,
  kind: LineKind,
  tariff?: ElectricityTariff,
): PeriodLine {
  const id = `${section}.${key}`
  return {
    id,
    section,
    label: labelOf(id),
    kind,
    computed: false,
    tariff,
    // Safe: every input is a number or a string. A malformed read-only month may lack the section.
    read: (entry) =>
      (entry[section] as Record<string, string | number> | undefined)?.[key],
  }
}

function computed(
  section: FigureSection,
  key: string,
  kind: LineKind,
  tariff?: ElectricityTariff,
): PeriodLine {
  const id = `${section}.${key}`
  return {
    id,
    section,
    label: labelOf(id),
    kind,
    computed: true,
    tariff,
    read: (_entry, figures) =>
      (figures[section] as unknown as Record<string, number | undefined>)[key],
  }
}

// Per meter, per tariff: previous index, current index, then the delta.
const electricityMeterLines = (['main', 'studio'] as const).flatMap((meter) =>
  ELECTRICITY_TARIFFS.flatMap((tariff) => [
    input('electricity', `${meter}${tariff}Previous`, 'number', tariff),
    input('electricity', `${meter}${tariff}`, 'number', tariff),
    computed(
      'electricity',
      `delta${meter === 'main' ? 'Main' : 'Studio'}${tariff}`,
      'number',
      tariff,
    ),
  ]),
)

export const LINES: PeriodLine[] = [
  input('common', 'startDate', 'date'),
  input('common', 'endDate', 'date'),
  input('common', 'landlordOccupants', 'int'),
  input('common', 'tenantOccupants', 'int'),
  input('common', 'tenantBillAdvance', 'money'),
  input('waterConsumption', 'mainMeterPrevious', 'litres'),
  input('waterConsumption', 'mainMeter', 'litres'),
  computed('waterConsumption', 'deltaMain', 'm3'),
  input('waterConsumption', 'studioUnsoftenedMeterPrevious', 'litres'),
  input('waterConsumption', 'studioUnsoftenedMeter', 'litres'),
  computed('waterConsumption', 'deltaStudioUnsoftened', 'm3'),
  input('waterConsumption', 'studioSoftenedMeterPrevious', 'litres'),
  input('waterConsumption', 'studioSoftenedMeter', 'litres'),
  computed('waterConsumption', 'deltaStudioSoftened', 'm3'),
  input('waterConsumption', 'pricePerM3', 'number'),
  input('waterConsumption', 'resourceWithdrawalFee', 'number'),
  input('waterConsumption', 'drinkingWaterFee', 'number'),
  input('waterConsumption', 'networkPerformanceFee', 'number'),
  input('waterConsumption', 'subscription', 'money'),
  input('waterConsumption', 'vat', 'number'),
  computed('waterConsumption', 'landlordShare', 'money'),
  computed('waterConsumption', 'tenantShare', 'money'),
  computed('waterConsumption', 'bill', 'money'),
  input('waterTreatment', 'monthlySubscriptionDistributor', 'money'),
  input('waterTreatment', 'monthlySubscriptionCommunity', 'money'),
  input('waterTreatment', 'collectionConsumptionDistributor', 'number'),
  input('waterTreatment', 'collectionConsumptionCommunity', 'number'),
  input('waterTreatment', 'sanitationPerformance', 'number'),
  input('waterTreatment', 'vat', 'number'),
  computed('waterTreatment', 'landlordShare', 'money'),
  computed('waterTreatment', 'tenantShare', 'money'),
  computed('waterTreatment', 'bill', 'money'),
  input('waterSoftener', 'description', 'text'),
  input('waterSoftener', 'quantity', 'number'),
  input('waterSoftener', 'unitPrice', 'money'),
  computed('waterSoftener', 'landlordShare', 'money'),
  computed('waterSoftener', 'tenantShare', 'money'),
  input('electricity', 'tariffMode', 'text'),
  input('electricity', 'subscriptionUnit', 'text'),
  ...electricityMeterLines,
  input('electricity', 'excisePerKwh', 'number'),
  input('electricity', 'kwhPriceBase', 'number', 'Base'),
  input('electricity', 'kwhPriceHc', 'number', 'Hc'),
  input('electricity', 'kwhPriceHp', 'number', 'Hp'),
  input('electricity', 'subscriptionPerUnit', 'money'),
  computed('electricity', 'subscriptionUnits', 'number'),
  input('electricity', 'ctaTax', 'money'),
  input('electricity', 'vat', 'number'),
  computed('electricity', 'landlordShare', 'money'),
  computed('electricity', 'tenantShare', 'money'),
  computed('electricity', 'bill', 'money'),
  input('internet', 'billedAmount', 'money'),
  computed('internet', 'landlordShare', 'money'),
  computed('internet', 'tenantShare', 'money'),
  input('heatPumpMaintenance', 'billedAmount', 'money'),
]

// Whether the line is a tariff line the month's tariff mode does not read. Without a mode no
// tariff is ruled out.
export function isInactiveTariffLine(line: PeriodLine, entry: MonthEntry): boolean {
  const mode = entry.electricity?.tariffMode
  if (!line.tariff || !mode) return false
  return !(TARIFFS_BY_MODE[mode] as readonly ElectricityTariff[]).includes(line.tariff)
}

const FORMATS: Record<Exclude<LineKind, 'date' | 'int' | 'text'>, Intl.NumberFormatOptions> = {
  money: { style: 'currency', currency: 'EUR' },
  number: { maximumFractionDigits: 5 },
  litres: { minimumFractionDigits: 3 },
  m3: { minimumFractionDigits: 3 },
}

// A value as the table shows it. A water index is stored in litres and shown in m³.
export function formatValue(kind: LineKind, value: string | number): string {
  if (kind === 'date') return String(value).split('-').reverse().join('/')
  if (kind === 'int') return String(value)
  if (kind === 'text') return fr.period.table.values[value as keyof typeof fr.period.table.values] ?? String(value)
  const shown = kind === 'litres' ? Number(value) / 1000 : Number(value)
  return shown.toLocaleString('fr-FR', FORMATS[kind])
}
