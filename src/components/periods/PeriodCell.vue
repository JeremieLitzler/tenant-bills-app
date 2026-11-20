<script setup lang="ts">
// One read-only month cell of the period table.
import { computed } from 'vue'

import { TableCell } from '@/components/ui/table'
import type { MonthEntry } from '@/domain/periodFile'
import type { MonthFigures } from '@/domain/periodFigures'
import { fr } from '@/i18n/fr'

import { formatValue, isInactiveTariffLine, type PeriodLine } from './periodLines'

const props = defineProps<{
  line: PeriodLine
  selected?: boolean
  entry: MonthEntry
  figures?: MonthFigures
}>()

// "typed": stored in the file, copied values included. "computed": a read-only figure.
const view = computed(() => {
  // A leftover value of the inactive tariff mode is never shown.
  if (isInactiveTariffLine(props.line, props.entry)) {
    return { provenance: 'not-applicable', text: '' }
  }
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

// The value stays displayed as stored; the warning only highlights it.
const warning = computed(() =>
  view.value.provenance === 'not-applicable' ? undefined : props.figures?.warnings[props.line.id],
)

// ⚠️ comes from CSS so the cell text stays the stored value.
const warningClass =
  "bg-destructive/10 text-destructive ring-destructive ring-2 ring-inset before:mr-1 before:content-['⚠️']"
</script>

<template>
  <TableCell
    class="relative text-right tabular-nums"
    :class="{
      'ring-ring/50 ring-1 ring-inset': selected && !warning,
      'font-medium': view.provenance === 'computed',
      'text-muted-foreground bg-muted/50 italic': view.provenance === 'not-applicable',
      [warningClass]: warning,
    }"
    role="gridcell"
    :aria-selected="selected"
    :data-provenance="view.provenance"
    :data-warning="warning"
  >
    {{ view.text }}
    <!-- Under the selected cell; above the sticky label column (z-10), below the sticky header (z-20). -->
    <div
      v-if="warning && selected"
      role="status"
      class="bg-background text-foreground absolute top-full right-0 z-[15] mt-1 w-56 rounded-md border p-2 text-left text-xs font-normal shadow-md"
    >
      {{ fr.period.table.warnings[warning] }}
    </div>
  </TableCell>
</template>
