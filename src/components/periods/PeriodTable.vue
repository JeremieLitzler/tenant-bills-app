<script setup lang="ts">
// The period table (F5): one row per line, one column per month present in the file. It only reads
// the period; every edit goes through the patch queue (ADR 0010).
import { computed } from 'vue'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePeriod } from '@/composables/usePeriods'
import type { Provenance } from '@/domain/inheritance'
import { fr } from '@/i18n/fr'

import { formatValue, LINES, type PeriodLine, SECTIONS } from './periodLines'

const props = defineProps<{ periodId: string }>()
const { file, figures } = usePeriod(() => props.periodId)

// "2026-09" as "septembre 2026". Read in UTC so the local time zone cannot shift the month.
function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return new Date(Date.UTC(year, number - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const columns = computed(() =>
  (figures.value?.months ?? []).map((monthFigures) => ({
    month: monthFigures.month,
    label: monthLabel(monthFigures.month),
    figures: monthFigures,
  })),
)

const PROVENANCE_CLASS: Record<Provenance, string> = {
  typed: '',
  inherited: 'italic text-muted-foreground',
  derived: 'text-muted-foreground',
  computed: 'font-medium',
}

function cell(line: PeriodLine, column: (typeof columns.value)[number]) {
  const resolved = line.read(file.value!, column.figures, column.month)
  if (!resolved) {
    // An uncomputable figure is "—", never zero; an input not typed yet stays blank.
    return { provenance: undefined, text: line.computed ? fr.period.table.empty : '', css: '' }
  }
  return {
    provenance: resolved.provenance,
    text: formatValue(line.kind, resolved.value),
    css: PROVENANCE_CLASS[resolved.provenance],
  }
}
</script>

<template>
  <Table v-if="file && figures" data-testid="period-table">
    <TableHeader>
      <TableRow>
        <TableHead>{{ fr.period.table.label }}</TableHead>
        <TableHead v-for="column in columns" :key="column.month" data-testid="period-month">
          {{ column.label }}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <template v-for="section in SECTIONS" :key="section.id">
        <TableRow class="bg-muted" :data-testid="`section-${section.id}`">
          <TableHead :colspan="columns.length + 1">{{ section.label }}</TableHead>
        </TableRow>
        <TableRow
          v-for="line in LINES.filter((l) => l.section === section.id)"
          :key="line.id"
          :data-testid="`line-${line.id}`"
        >
          <TableHead scope="row">{{ line.label }}</TableHead>
          <TableCell
            v-for="column in columns"
            :key="column.month"
            class="text-right tabular-nums"
            :class="cell(line, column).css"
            :data-provenance="cell(line, column).provenance"
          >
            {{ cell(line, column).text }}
          </TableCell>
        </TableRow>
      </template>
    </TableBody>
  </Table>
</template>
