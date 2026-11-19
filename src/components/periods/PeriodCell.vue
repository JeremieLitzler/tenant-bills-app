<script setup lang="ts">
// One month cell of the period table. It shows the typed text while it is edited; saving is the
// table's job (the patch queue, ADR 0010).
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
  editing?: boolean
  invalid?: boolean
}>()
const draft = defineModel<string>('draft', { default: '' })
const emit = defineEmits<{ blur: [] }>()
const vFocus = { mounted: (el: HTMLElement) => el.focus() }

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
</script>

<template>
  <TableCell
    class="text-right tabular-nums"
    :class="{
      'ring-ring/50 ring-1 ring-inset': selected && !invalid,
      'ring-destructive ring-2 ring-inset': invalid,
      'font-medium': view.provenance === 'computed',
      'text-muted-foreground bg-muted/50 italic': view.provenance === 'not-applicable',
    }"
    role="gridcell"
    :aria-selected="selected"
    :data-provenance="view.provenance"
  >
    <input
      v-if="editing"
      v-model="draft"
      v-focus
      :aria-label="line.label"
      :aria-invalid="invalid"
      class="w-full bg-transparent text-right outline-none"
      @blur="emit('blur')"
    />
    <template v-else>{{ view.text }}</template>
  </TableCell>
</template>
