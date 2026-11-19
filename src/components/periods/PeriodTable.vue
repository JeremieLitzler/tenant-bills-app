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
const cellId = (rowIndex: number, colIndex: number) =>
  `${props.periodId}-cell-${rowIndex}-${colIndex}`
// The id and selected state of a cell, both derived from its position.
const cellProps = (line: (typeof LINES)[number], colIndex: number) => ({
  id: cellId(rowOf(line), colIndex),
  selected: rowOf(line) === row.value && colIndex === col.value,
})
const MOVES: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function select(rowIndex: number, colIndex: number) {
  row.value = Math.max(0, Math.min(LINES.length - 1, rowIndex))
  col.value = Math.max(0, Math.min(columns.value.length - 1, colIndex))
}

// Going to a period with fewer months: the selected cell may not exist there, start from the first.
// Zero columns is a loading state, not a shorter period.
watch(
  () => columns.value.length,
  (count) => {
    if (count > 0 && col.value >= count) select(0, 0)
  },
)

function onKeydown(event: KeyboardEvent) {
  // Arrows are taken from anything inside the table: the cell editing ticket decides how selection
  // mode and edit mode share the keys (prototype useGrid ignores them while editing).
  const move = MOVES[event.key]
  if (!move) return
  const [dRow, dCol] = move
  event.preventDefault()
  select(row.value + dRow, col.value + dCol)
}

watch([row, col], async () => {
  await nextTick()
  document
    .getElementById(cellId(row.value, col.value))
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
})
</script>

<template>
  <div v-if="file && figures" class="group flex flex-col gap-2">
    <!-- Kept in the layout when hidden so the table does not jump when a click gives it the focus. -->
    <p
      id="period-table-hint"
      class="text-muted-foreground invisible text-sm group-has-[:focus-visible]:visible"
    >
      {{ fr.period.table.keyboardHint }}
    </p>
    <!-- Tab leaves the table because no cell is a focus stop of its own: keep it so when cells get edited. -->
    <Table
      data-testid="period-table"
      role="grid"
      tabindex="0"
      aria-describedby="period-table-hint"
      :aria-activedescendant="cellId(row, col)"
      @keydown="onKeydown"
      container-class="focus-visible:outline-ring/50 focus-visible:outline-2 focus-visible:outline-offset-2 max-h-[calc(100vh-8rem)] overflow-auto scroll-pt-10 scroll-pl-40 max-md:scroll-pl-32 [container-type:inline-size] max-md:[scrollbar-width:none] max-md:snap-x max-md:snap-mandatory"
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
              v-for="(column, colIndex) in columns"
              :key="column.month"
              v-bind="cellProps(line, colIndex)"
              :line="line"
              :entry="column.entry"
              :figures="column.figures"
              @click="select(rowOf(line), colIndex)"
            />
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
