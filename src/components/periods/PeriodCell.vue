<script setup lang="ts">
// One read-only month cell of the period table.
import { computed } from 'vue'

import IconTriangleAlert from '@/components/icons/IconTriangleAlert.vue'
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
  // A patch queued before the close was applied after it.
  editedAfterClose?: boolean
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

// The warning icon is an inline SVG, not text, so the cell text stays the stored value.
const warningClass = 'bg-destructive/10 text-destructive ring-destructive ring-2 ring-inset'
</script>

<template>
  <TableCell
    class="relative text-right tabular-nums"
    :class="{
      'ring-ring/50 ring-1 ring-inset': selected && !warning,
      'font-medium': view.provenance === 'computed',
      'text-muted-foreground bg-muted/50 italic': view.provenance === 'not-applicable',
      [warningClass]: warning,
      'underline decoration-dotted decoration-2': editedAfterClose,
    }"
    role="gridcell"
    :aria-selected="selected"
    :data-provenance="view.provenance"
    :data-warning="warning"
    :data-edited-after-close="editedAfterClose || undefined"
    :title="editedAfterClose ? fr.period.table.editedAfterClose : undefined"
  >
    <IconTriangleAlert
      v-if="warning"
      class="mr-1 inline size-3.5 align-text-bottom"
      aria-hidden="true"
    />
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
