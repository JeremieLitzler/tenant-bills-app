<script setup lang="ts">
// One month cell of the period table. It only reads: an edit never goes through the cell's props.
import { computed } from 'vue'

import { TableCell } from '@/components/ui/table'
import type { MonthEntry } from '@/domain/periodFile'
import type { MonthFigures } from '@/domain/periodFigures'
import { fr } from '@/i18n/fr'

import { formatValue, type PeriodLine } from './periodLines'

const props = defineProps<{ line: PeriodLine; entry: MonthEntry; figures?: MonthFigures }>()

// "typed": stored in the file, copied values included. "computed": a read-only figure.
const view = computed(() => {
  const value = props.figures ? props.line.read(props.entry, props.figures) : undefined
  if (value === undefined) {
    // An uncomputable figure is "—", never zero; an input not typed yet stays blank.
    return { provenance: undefined, text: props.line.computed ? fr.period.table.empty : '' }
  }
  return {
    provenance: props.line.computed ? 'computed' : 'typed',
    text: formatValue(props.line.kind, value),
  }
})
</script>

<template>
  <TableCell
    class="text-right tabular-nums"
    :class="{ 'font-medium': view.provenance === 'computed' }"
    :data-provenance="view.provenance"
  >
    {{ view.text }}
  </TableCell>
</template>
