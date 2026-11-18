// The electricity tariffs and which ones each tariff mode reads (docs/period-file.md, `tariffMode`).
// Shared by the figures, the estimated twelfth month and the period table. Primitives only.

export const ELECTRICITY_TARIFFS = ['Base', 'Hc', 'Hp'] as const
export type ElectricityTariff = (typeof ELECTRICITY_TARIFFS)[number]

export const TARIFFS_BY_MODE = {
  base: ['Base'],
  hchp: ['Hc', 'Hp'],
} as const satisfies Record<string, readonly ElectricityTariff[]>
