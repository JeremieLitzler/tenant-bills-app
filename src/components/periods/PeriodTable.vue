<script setup lang="ts">
// The period table (F5): one row per line, one column per month present in the file. It only reads
// the period; every edit goes through the patch queue (ADR 0010).
import { computed, nextTick, ref, watch } from 'vue'

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

// Selection mode (F5): the container is the single Tab stop; the selected cell is its active descendant.
const rowIndexes = new Map(LINES.map((line, index) => [line.id, index]))
const rowOf = (line: (typeof LINES)[number]) => rowIndexes.get(line.id)!
const row = ref(0)
const col = ref(0)
const cellId = (r: number, c: number) => `${props.periodId}-cell-${r}-${c}`
const MOVES: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function select(r: number, c: number) {
  row.value = Math.max(0, Math.min(LINES.length - 1, r))
  col.value = Math.max(0, Math.min(columns.value.length - 1, c))
}

function onKeydown(event: KeyboardEvent) {
  const move = MOVES[event.key]
  if (!move) return
  event.preventDefault()
  select(row.value + move[0], col.value + move[1])
}

watch([row, col], async () => {
  await nextTick()
  document
    .getElementById(cellId(row.value, col.value))
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
})
</script>

<template>
  <Table
    v-if="file && figures"
    data-testid="period-table"
    role="grid"
    tabindex="0"
    :aria-activedescendant="cellId(row, col)"
    @keydown="onKeydown"
    container-class="max-h-[calc(100vh-8rem)] overflow-auto scroll-pt-10 scroll-pl-40 max-md:scroll-pl-32 [container-type:inline-size] max-md:[scrollbar-width:none] max-md:snap-x max-md:snap-mandatory"
    class="w-max min-w-full border-separate border-spacing-0 [&_td]:snap-start max-md:[&_td]:w-[calc(100cqw-8rem)] max-md:[&_td]:whitespace-normal"
  >
    <TableHeader>
      <TableRow>
        <TableHead
          class="bg-background sticky top-0 left-0 z-30 w-40 min-w-40 max-md:w-32 max-md:min-w-32 max-md:whitespace-normal"
          >{{ fr.period.table.label }}</TableHead
        >
        <TableHead
          v-for="column in columns"
          :key="column.month"
          class="bg-background sticky top-0 z-20 snap-start"
          data-testid="period-month"
        >
          {{ column.label }}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <template v-for="section in SECTIONS" :key="section.id">
        <TableRow class="bg-muted" :data-testid="`section-${section.id}`">
          <TableHead :colspan="columns.length + 1" class="bg-muted">
            <span class="sticky left-2">{{ section.label }}</span>
          </TableHead>
        </TableRow>
        <TableRow
          v-for="line in LINES.filter((l) => l.section === section.id)"
          :key="line.id"
          role="row"
          :data-testid="`line-${line.id}`"
        >
          <TableHead
            scope="row"
            class="bg-background sticky left-0 z-10 w-40 min-w-40 max-md:w-32 max-md:min-w-32 max-md:whitespace-normal"
            >{{ line.label }}</TableHead
          >
          <PeriodCell
            v-for="(column, c) in columns"
            :key="column.month"
            :id="cellId(rowOf(line), c)"
            :selected="rowOf(line) === row && c === col"
            :line="line"
            :entry="column.entry"
            :figures="column.figures"
            @click="select(rowOf(line), c)"
          />
        </TableRow>
      </template>
    </TableBody>
  </Table>
</template>
