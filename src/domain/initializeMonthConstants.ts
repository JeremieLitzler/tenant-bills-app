// Constants of the month initialization (docs/scenarios.md, Cases 3 and 6). Primitives and arrays only.

export const MAX_MONTHS = 12

// docs/period-file.md, "The estimated twelfth month": the HC share of an estimated HC/HP total.
export const HC_SHARE = 0.3

// The `endDate` suggestion (functional breakdown grilling, Q11b): the 15th of the month, when that
// falls Thursday to Sunday, otherwise the Sunday before.
export const SUGGESTED_END_DAY_OF_MONTH = 15
export const SUNDAY = 0
export const MONDAY = 1
export const WEDNESDAY = 3

export const WATER_METERS = ['mainMeter', 'studioUnsoftenedMeter', 'studioSoftenedMeter'] as const
export const ELECTRICITY_METERS = ['main', 'studio'] as const
