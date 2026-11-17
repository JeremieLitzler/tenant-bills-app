<script setup lang="ts">
// The period table (F5): one row per line, one column per month present in the file. It only reads
// the period; every edit goes through the patch queue (ADR 0010).
import { computed } from 'vue'

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

import PeriodCell from './PeriodCell.vue'
import { LINES, SECTIONS } from './periodLines'

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

// A read-only file can hold malformed entries: show only those with a month.
const columns = computed(() =>
  (file.value?.months ?? [])
    .map((entry, index) => ({ entry, figures: figures.value?.months[index] }))
    .filter(({ entry }) => typeof entry?.month === 'string')
    .map(({ entry, figures }) => ({
      month: entry.month,
      label: monthLabel(entry.month),
      entry,
      figures,
    })),
)

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
          <PeriodCell
            v-for="column in columns"
            :key="column.month"
            :line="line"
            :entry="column.entry"
            :figures="column.figures"
          />
        </TableRow>
      </template>
    </TableBody>
  </Table>
</template>
